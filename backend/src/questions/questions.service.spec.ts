import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { Question } from './entities/question.entity';
import { QuestionImage } from './entities/question-image.entity';
import { QuestionTopic } from './entities/question-topic.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Subject } from '../subjects/entities/subject.entity';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let dataSource: DataSource;

  const mockManager = {
    find: jest.fn(),
    findOne: jest.fn(),
    insert: jest.fn(),
    query: jest.fn(),
  };

  const mockDataSource = {
    manager: mockManager,
    transaction: jest.fn((cb) => cb(mockManager)),
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
    dataSource = module.get<DataSource>(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return empty list when no questions exist', async () => {
      mockManager.find.mockResolvedValueOnce([]); // questions
      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('should return questions with topics and images mapped', async () => {
      mockManager.find
        .mockResolvedValueOnce([
          { quesId: 1, quesText: 'Sample text', quesType: 'MCQ', sourceId: 2 },
        ]) // questions
        .mockResolvedValueOnce([{ quesId: 1, topicId: 10 }]) // questionTopics
        .mockResolvedValueOnce([
          { imageId: 100, quesId: 1, imageUrl: 'https://cloudinary.com/img.jpg' },
        ]) // questionImages
        .mockResolvedValueOnce([
          { topicId: 10, topicName: 'Trees', chapterId: 3 },
        ]); // topics

      const result = await service.findAll();
      expect(result).toHaveLength(1);
      expect(result[0].quesId).toBe(1);
      expect(result[0].topics).toEqual([
        { topicId: 10, topicName: 'Trees', chapterId: 3 },
      ]);
      expect(result[0].images).toEqual([
        {
          imageId: 100,
          imageUrl: 'https://cloudinary.com/img.jpg',
          displayOrder: 0,
        },
      ]);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if question does not exist', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('should hydrate question with chapter, subject, source, and images', async () => {
      mockManager.findOne
        .mockResolvedValueOnce({
          quesId: 5,
          quesText: 'Explain binary search',
          quesType: 'SUBJECTIVE',
          sourceId: 7,
        }) // question
        .mockResolvedValueOnce({
          chapterId: 2,
          chapterNo: 1,
          chapterName: 'Search',
          subjectKey: 12,
        }) // chapter
        .mockResolvedValueOnce({
          subjectKey: 12,
          subjectId: 'CS101',
          subjectName: 'Computer Science',
          semester: 2,
        }); // subject

      mockManager.find
        .mockResolvedValueOnce([
          { imageId: 20, quesId: 5, imageUrl: 'https://cloudinary.com/bin.png' },
        ]) // images
        .mockResolvedValueOnce([{ quesId: 5, topicId: 3 }]) // questionTopics
        .mockResolvedValueOnce([
          { topicId: 3, topicName: 'Binary Search', chapterId: 2 },
        ]); // topics

      mockDataSource.query.mockResolvedValueOnce([
        {
          sourceId: 7,
          sourceType: 'EXAM',
          examType: 'Finals',
          examYear: 2024,
          semesterNo: 2,
          subjectName: 'Computer Science',
        },
      ]);

      const result = await service.findOne(5);
      expect(result.quesId).toBe(5);
      expect(result.chapter?.chapterName).toBe('Search');
      expect(result.subject?.subjectId).toBe('CS101');
      expect(result.source?.sourceType).toBe('EXAM');
      expect(result.images).toHaveLength(1);
      expect(result.images[0].imageUrl).toBe('https://cloudinary.com/bin.png');
    });
  });

  describe('create', () => {
    it('should throw BadRequestException if sourceId does not exist', async () => {
      mockManager.query.mockResolvedValueOnce([]); // empty sources

      await expect(
        service.create({
          quesText: 'Test question',
          quesType: 'MCQ',
          sourceId: 999,
          topicIds: [1],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if any topicId is missing', async () => {
      mockManager.query.mockResolvedValueOnce([{ SourceID: 1 }]);
      mockManager.find.mockResolvedValueOnce([{ topicId: 1 }]); // missing topic 2

      await expect(
        service.create({
          quesText: 'Test question',
          quesType: 'MCQ',
          sourceId: 1,
          topicIds: [1, 2],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should insert question, topics, and images in one transaction', async () => {
      mockManager.query.mockResolvedValueOnce([{ SourceID: 1 }]);
      mockManager.find.mockResolvedValueOnce([{ topicId: 10 }]);
      mockManager.insert
        .mockResolvedValueOnce({ identifiers: [{ quesId: 42 }] }) // question
        .mockResolvedValueOnce({}) // topics
        .mockResolvedValueOnce({}); // images

      const result = await service.create({
        quesText: 'What is a B-Tree?',
        quesType: 'SUBJECTIVE',
        sourceId: 1,
        topicIds: [10],
        imageUrls: ['https://cloudinary.com/btree.png'],
      });

      expect(result.quesId).toBe(42);
      expect(result.imageUrls).toEqual(['https://cloudinary.com/btree.png']);
      expect(mockManager.insert).toHaveBeenCalledTimes(3);
    });
  });
});
