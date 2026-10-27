import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  QuizService,
  normalizeFillupAnswer,
  normalizeTrueFalse,
} from './quiz.service';
import { QuizQuestion, QuizDifficulty, QuizQuestionType } from './entities/quiz-question.entity';
import { QuizQuestionTopic } from './entities/quiz-question-topic.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptResponse } from './entities/quiz-attempt-response.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Department } from '../departments/entities/department.entity';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { UserRole, AccountStatus } from '../users/entities/user.entity';

describe('QuizService', () => {
  let service: QuizService;
  let mockQuestionRepo: any;
  let mockAttemptRepo: any;
  let mockResponseRepo: any;
  let mockSubjectRepo: any;
  let mockChapterRepo: any;
  let mockTopicRepo: any;
  let mockDepartmentRepo: any;
  let mockDataSource: any;

  const testUser: SafeUser = {
    userId: 4,
    email: 'u25cs044@coed.svnit.ac.in',
    displayName: 'Harman',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockQuestionRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    mockAttemptRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ attemptId: 10, ...d })),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
    };
    mockResponseRepo = {
      create: jest.fn().mockImplementation((d) => d),
      save: jest.fn(),
    };
    mockSubjectRepo = { find: jest.fn() };
    mockChapterRepo = { find: jest.fn(), findOneBy: jest.fn() };
    mockTopicRepo = { find: jest.fn() };
    mockDepartmentRepo = { find: jest.fn() };
    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) =>
        cb({
          save: jest.fn().mockResolvedValue(true),
          create: jest.fn().mockImplementation((_, d) => d),
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: getRepositoryToken(QuizQuestion), useValue: mockQuestionRepo },
        { provide: getRepositoryToken(QuizAttempt), useValue: mockAttemptRepo },
        { provide: getRepositoryToken(QuizAttemptResponse), useValue: mockResponseRepo },
        { provide: getRepositoryToken(Subject), useValue: mockSubjectRepo },
        { provide: getRepositoryToken(Chapter), useValue: mockChapterRepo },
        { provide: getRepositoryToken(Topic), useValue: mockTopicRepo },
        { provide: getRepositoryToken(Department), useValue: mockDepartmentRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  describe('Normalization Utilities', () => {
    it('normalizeFillupAnswer handles casing, spacing, and punctuation correctly', () => {
      expect(normalizeFillupAnswer('   Binary   Search   Tree  ')).toBe('binary search tree');
      expect(normalizeFillupAnswer('O( log n )')).toBe('o(log n)');
      expect(normalizeFillupAnswer('O(log n)')).toBe('o(log n)');
    });

    it('normalizeTrueFalse handles boolean and string representations', () => {
      expect(normalizeTrueFalse(true)).toBe('TRUE');
      expect(normalizeTrueFalse(false)).toBe('FALSE');
      expect(normalizeTrueFalse('true')).toBe('TRUE');
      expect(normalizeTrueFalse('False')).toBe('FALSE');
      expect(normalizeTrueFalse('t')).toBe('TRUE');
      expect(normalizeTrueFalse('f')).toBe('FALSE');
    });
  });

  describe('submitRevisionAttempt with 3 Question Types', () => {
    it('grades MCQ, FILLUPS, and TRUE_FALSE correctly', async () => {
      mockAttemptRepo.findOne.mockResolvedValue({
        attemptId: 10,
        userId: testUser.userId,
        isCompleted: false,
        totalQuestions: 3,
        subject: { subjectName: 'Data Structures' },
      });

      mockQuestionRepo.find.mockResolvedValue([
        {
          quizQuesId: 1,
          questionType: QuizQuestionType.MCQ,
          quesText: 'What is FIFO?',
          options: { A: 'Stack', B: 'Queue' },
          correctAnswer: 'B',
          explanation: 'Queue is FIFO.',
          difficulty: QuizDifficulty.EASY,
          topics: [],
        },
        {
          quizQuesId: 2,
          questionType: QuizQuestionType.FILLUPS,
          quesText: 'Binary search complexity is ____.',
          correctAnswer: 'O(log n)',
          acceptedAnswers: ['O(log n)', 'logarithmic time', 'log n'],
          explanation: 'It divides search space in half.',
          difficulty: QuizDifficulty.MEDIUM,
          topics: [],
        },
        {
          quizQuesId: 3,
          questionType: QuizQuestionType.TRUE_FALSE,
          quesText: 'Every tree is an acyclic graph.',
          correctAnswer: 'TRUE',
          explanation: 'Trees have no cycles.',
          difficulty: QuizDifficulty.EASY,
          topics: [],
        },
      ]);

      const result = await service.submitRevisionAttempt(
        {
          attemptId: 10,
          timeTakenSeconds: 60,
          answers: [
            { quizQuesId: 1, selectedAnswer: 'B' }, // Correct MCQ
            { quizQuesId: 2, selectedAnswer: '   Logarithmic   Time  ' }, // Correct Fillup via acceptedAnswers & normalization!
            { quizQuesId: 3, selectedAnswer: 'false' }, // Incorrect True/False
          ],
        },
        testUser,
      );

      expect(result.totalQuestions).toBe(3);
      expect(result.correctAnswers).toBe(2);
      expect(result.incorrectAnswers).toBe(1);
      expect(result.unanswered).toBe(0);
      expect(result.accuracy).toBe(66.67);

      expect(result.questions[0].isCorrect).toBe(true);
      expect(result.questions[1].isCorrect).toBe(true);
      expect(result.questions[2].isCorrect).toBe(false);
      expect(result.questions[2].correctAnswer).toBe('TRUE');
    });
  });
});
