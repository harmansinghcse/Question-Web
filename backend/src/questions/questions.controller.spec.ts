import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { CloudinaryService } from './cloudinary.service';

describe('QuestionsController', () => {
  let controller: QuestionsController;
  let questionsService: QuestionsService;
  let cloudinaryService: CloudinaryService;

  const mockQuestionsService = {
    findAll: jest.fn().mockResolvedValue([
      {
        quesId: 1,
        quesText: 'What is quicksort?',
        quesType: 'SUBJECTIVE',
        sourceId: 10,
        topics: [{ topicId: 1, topicName: 'Sorting', chapterId: 2 }],
        images: [{ imageId: 1, imageUrl: 'https://cloudinary.com/img1.png', displayOrder: 0 }],
      },
    ]),
    findOne: jest.fn().mockResolvedValue({
      quesId: 1,
      quesText: 'What is quicksort?',
      quesType: 'SUBJECTIVE',
      sourceId: 10,
      source: { sourceId: 10, sourceType: 'EXAM', label: 'Midterm 2024' },
      chapter: { chapterId: 2, chapterNo: 3, chapterName: 'Divide and Conquer' },
      subject: { subjectKey: 5, subjectId: 'DAA', subjectName: 'Design and Analysis of Algorithms', semester: 4 },
      topics: [{ topicId: 1, topicName: 'Sorting', chapterId: 2 }],
      images: [{ imageId: 1, imageUrl: 'https://cloudinary.com/img1.png', displayOrder: 0 }],
    }),
    create: jest.fn().mockResolvedValue({
      quesId: 2,
      quesText: 'What is merge sort?',
      quesType: 'SUBJECTIVE',
      sourceId: 10,
      topicIds: [1],
      imageUrls: ['https://cloudinary.com/img2.png'],
    }),
  };

  const mockCloudinaryService = {
    getUploadSignature: jest.fn().mockReturnValue({
      signature: 'mock_signature_abc123',
      timestamp: 1700000000,
      apiKey: 'mock_key',
      cloudName: 'mock_cloud',
      folder: 'question_web_images',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        {
          provide: QuestionsService,
          useValue: mockQuestionsService,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    controller = module.get<QuestionsController>(QuestionsController);
    questionsService = module.get<QuestionsService>(QuestionsService);
    cloudinaryService = module.get<CloudinaryService>(CloudinaryService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUploadSignature', () => {
    it('should return signature from CloudinaryService', () => {
      const sig = controller.getUploadSignature();
      expect(sig.signature).toBe('mock_signature_abc123');
      expect(cloudinaryService.getUploadSignature).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should return questions with topics and images', async () => {
      const list = await controller.findAll();
      expect(list).toHaveLength(1);
      expect(list[0].quesId).toBe(1);
      expect(list[0].images).toHaveLength(1);
      expect(questionsService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return detailed question by id', async () => {
      const q = await controller.findOne(1);
      expect(q.quesId).toBe(1);
      expect(q.source?.label).toBe('Midterm 2024');
      expect(q.subject?.subjectId).toBe('DAA');
      expect(questionsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('create', () => {
    it('should create question and delegate to service', async () => {
      const dto = {
        quesText: 'What is merge sort?',
        quesType: 'SUBJECTIVE' as const,
        sourceId: 10,
        topicIds: [1],
        imageUrls: ['https://cloudinary.com/img2.png'],
      };
      const created = await controller.create(dto);
      expect(created.quesId).toBe(2);
      expect(created.imageUrls).toEqual(['https://cloudinary.com/img2.png']);
      expect(questionsService.create).toHaveBeenCalledWith(dto);
    });
  });
});
