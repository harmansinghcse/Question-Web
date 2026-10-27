import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { QuizImporterService } from './quiz-importer.service';
import { QuizDifficulty, QuizQuestionType } from './entities/quiz-question.entity';

describe('QuizImporterService', () => {
  let service: QuizImporterService;
  let mockDataSource: any;

  beforeEach(async () => {
    mockDataSource = {
      manager: {
        find: jest.fn(),
      },
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizImporterService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<QuizImporterService>(QuizImporterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalizeOptions', () => {
    it('should convert array of options to A, B, C, D map', () => {
      const result = service.normalizeOptions(['Option 1', 'Option 2', 'Option 3', 'Option 4']);
      expect(result).toEqual({
        A: 'Option 1',
        B: 'Option 2',
        C: 'Option 3',
        D: 'Option 4',
      });
    });

    it('should uppercase keys of object options', () => {
      const result = service.normalizeOptions({
        a: 'First',
        b: 'Second',
        c: 'Third',
        d: 'Fourth',
      });
      expect(result).toEqual({
        A: 'First',
        B: 'Second',
        C: 'Third',
        D: 'Fourth',
      });
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent sha256 hash irrespective of whitespace/casing', () => {
      const hash1 = service.generateContentHash(1, QuizQuestionType.MCQ, 'What is a stack?');
      const hash2 = service.generateContentHash(1, QuizQuestionType.MCQ, '   what is   a stack?  ');
      expect(hash1).toBe(hash2);
    });

    it('should distinguish different question types', () => {
      const hash1 = service.generateContentHash(1, QuizQuestionType.MCQ, 'What is a stack?');
      const hash2 = service.generateContentHash(1, QuizQuestionType.TRUE_FALSE, 'What is a stack?');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('importBatch', () => {
    it('should validate and import MCQ, FILLUPS, and TRUE_FALSE correctly', async () => {
      mockDataSource.manager.find.mockResolvedValueOnce([
        { chapterId: 1, chapterName: 'Intro' },
      ]);
      mockDataSource.manager.find.mockResolvedValueOnce([]); // No topics
      mockDataSource.manager.find.mockResolvedValueOnce([]); // No duplicates

      mockDataSource.transaction.mockImplementation(async (cb: any) => {
        const fakeManager = {
          create: jest.fn().mockImplementation((entity, data) => data),
          save: jest.fn().mockResolvedValue({ quizQuesId: 101 }),
        };
        return cb(fakeManager);
      });

      const report = await service.importBatch({
        questions: [
          {
            questionType: QuizQuestionType.MCQ,
            quesText: 'What is FIFO?',
            options: { A: 'Stack', B: 'Queue' },
            correctAnswer: 'B',
            explanation: 'Queue is FIFO.',
            chapterId: 1,
          },
          {
            questionType: QuizQuestionType.FILLUPS,
            quesText: 'The time complexity of binary search is ____.',
            acceptedAnswers: ['O(log n)', 'logarithmic time'],
            explanation: 'Binary search is O(log n).',
            chapterId: 1,
          },
          {
            questionType: QuizQuestionType.TRUE_FALSE,
            quesText: 'Every tree is a connected acyclic graph.',
            correctAnswer: true,
            explanation: 'Trees are connected and acyclic.',
            chapterId: 1,
          },
        ],
      });

      expect(report.totalReceived).toBe(3);
      expect(report.inserted).toBe(3);
      expect(report.failedValidation).toBe(0);
      expect(report.skippedDuplicates).toBe(0);
    });

    it('should reject invalid FILLUPS without any accepted answer', async () => {
      mockDataSource.manager.find.mockResolvedValueOnce([
        { chapterId: 1, chapterName: 'Intro' },
      ]);
      mockDataSource.manager.find.mockResolvedValueOnce([]);
      mockDataSource.manager.find.mockResolvedValueOnce([]);

      const report = await service.importBatch({
        questions: [
          {
            questionType: QuizQuestionType.FILLUPS,
            quesText: 'Invalid Fillup Question',
            explanation: 'Exp',
            chapterId: 1,
          },
        ],
      });

      expect(report.failedValidation).toBe(1);
      expect(report.inserted).toBe(0);
      expect(report.errors[0].reason).toContain('requires at least one accepted answer');
    });

    it('should reject invalid TRUE_FALSE with non-boolean answer', async () => {
      mockDataSource.manager.find.mockResolvedValueOnce([
        { chapterId: 1, chapterName: 'Intro' },
      ]);
      mockDataSource.manager.find.mockResolvedValueOnce([]);
      mockDataSource.manager.find.mockResolvedValueOnce([]);

      const report = await service.importBatch({
        questions: [
          {
            questionType: QuizQuestionType.TRUE_FALSE,
            quesText: 'Invalid TF Question',
            correctAnswer: 'Maybe',
            explanation: 'Exp',
            chapterId: 1,
          },
        ],
      });

      expect(report.failedValidation).toBe(1);
      expect(report.inserted).toBe(0);
      expect(report.errors[0].reason).toContain('requires a boolean correctAnswer');
    });
  });
});
