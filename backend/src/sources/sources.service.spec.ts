import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { SourcesService } from './sources.service';

describe('SourcesService', () => {
  let service: SourcesService;

  const mockManager = {
    findOne: jest.fn(),
    find: jest.fn(),
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
        SourcesService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<SourcesService>(SourcesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return list of sources with labels', async () => {
      mockDataSource.query.mockResolvedValueOnce([
        {
          sourceId: 1,
          sourceType: 'EXAM',
          examType: 'MIDSEM',
          examYear: 2025,
          semesterNo: 1,
          subjectKey: 3,
          subjectName: 'Introduction to Programming',
          subjectId: 'CS103',
          deptId: 1,
          deptName: 'Computer Science and Engineering',
          month: null,
          bookName: null,
          authorName: null,
          questionCount: 5,
        },
        {
          sourceId: 2,
          sourceType: 'BOOK',
          examType: null,
          examYear: null,
          semesterNo: null,
          subjectKey: null,
          subjectName: null,
          subjectId: null,
          deptId: null,
          deptName: null,
          month: null,
          bookName: 'Introduction to Algorithms',
          authorName: 'Cormen et al.',
          questionCount: 0,
        },
      ]);

      const result = await service.findAll();
      expect(result).toHaveLength(2);
      expect(result[0].sourceId).toBe(1);
      expect(result[0].sourceType).toBe('EXAM');
      expect(result[0].label).toContain('MIDSEM 2025');
      expect(result[1].sourceType).toBe('BOOK');
      expect(result[1].label).toBe('Introduction to Algorithms — Cormen et al.');
    });
  });

  describe('createSource', () => {
    it('should insert a source and return id and type', async () => {
      mockManager.insert.mockResolvedValueOnce({
        identifiers: [{ sourceId: 10 }],
      });

      const res = await service.createSource({ sourceType: 'EXAM' });
      expect(res.sourceId).toBe(10);
      expect(res.sourceType).toBe('EXAM');
      expect(mockManager.insert).toHaveBeenCalledTimes(1);
    });
  });

  describe('createExam', () => {
    it('should throw NotFoundException if subject does not exist', async () => {
      mockManager.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createExam({
          subjectKey: 999,
          examType: 'MIDSEM',
          examYear: 2026,
          semesterNo: 2,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if duplicate exam exists', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        subjectKey: 3,
        subjectName: 'Introduction to Programming',
      });
      mockManager.query.mockResolvedValueOnce([{ sourceId: 1 }]);

      await expect(
        service.createExam({
          subjectKey: 3,
          examType: 'MIDSEM',
          examYear: 2025,
          semesterNo: 1,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create Source and Exam in transaction', async () => {
      mockManager.findOne.mockResolvedValueOnce({
        subjectKey: 3,
        subjectId: 'CS103',
        subjectName: 'Introduction to Programming',
        deptId: 1,
      });
      mockManager.query.mockResolvedValueOnce([]); // no duplicate
      mockManager.insert
        .mockResolvedValueOnce({ identifiers: [{ sourceId: 15 }] }) // source
        .mockResolvedValueOnce({}); // exam

      const res = await service.createExam({
        subjectKey: 3,
        examType: 'ENDSEM',
        examYear: 2026,
        semesterNo: 2,
        month: 'MAY',
      });

      expect(res.sourceId).toBe(15);
      expect(res.examType).toBe('ENDSEM');
      expect(res.examYear).toBe(2026);
      expect(mockManager.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('createBook', () => {
    it('should throw ConflictException if duplicate book exists', async () => {
      mockManager.query.mockResolvedValueOnce([{ sourceId: 4 }]);

      await expect(
        service.createBook({
          bookName: 'Database Systems',
          authorName: 'Silberschatz',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if name or author is empty', async () => {
      await expect(
        service.createBook({
          bookName: '   ',
          authorName: 'Author',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create Source and Book in transaction', async () => {
      mockManager.query.mockResolvedValueOnce([]); // no duplicate
      mockManager.insert
        .mockResolvedValueOnce({ identifiers: [{ sourceId: 20 }] }) // source
        .mockResolvedValueOnce({}); // book

      const res = await service.createBook({
        bookName: 'Operating System Concepts',
        authorName: 'Silberschatz',
      });

      expect(res.sourceId).toBe(20);
      expect(res.bookName).toBe('Operating System Concepts');
      expect(mockManager.insert).toHaveBeenCalledTimes(2);
    });
  });
});
