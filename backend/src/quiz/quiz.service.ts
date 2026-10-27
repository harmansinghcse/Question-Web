import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizQuestion, QuizDifficulty, QuizQuestionType } from './entities/quiz-question.entity';
import { QuizQuestionTopic } from './entities/quiz-question-topic.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { QuizAttemptResponse } from './entities/quiz-attempt-response.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Department } from '../departments/entities/department.entity';
import { SafeUser } from '../auth/interfaces/auth-response.interface';
import { StartQuizDto, QuizDifficultyFilter, QuizTypeFilter } from './dto/start-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { AdminQuizQueryDto, UpdateQuizQuestionDto } from './dto/admin-quiz-query.dto';
import { parseStudentEmail } from '../common/student-profile.util';

export function normalizeFillupAnswer(input?: string | null): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([=+\-*\/()[\],:<>!&|])\s*/g, '$1');
}

export function normalizeTrueFalse(input?: string | boolean | null): string {
  if (typeof input === 'boolean') return input ? 'TRUE' : 'FALSE';
  if (!input) return '';
  const s = input.trim().toUpperCase();
  if (s === 'TRUE' || s === 'T' || s === '1' || s === 'YES') return 'TRUE';
  if (s === 'FALSE' || s === 'F' || s === '0' || s === 'NO') return 'FALSE';
  return s;
}

export interface StudentQuizQuestionView {
  quizQuesId: number;
  questionType: QuizQuestionType;
  quesText: string;
  options?: Record<string, string> | null;
  difficulty: QuizDifficulty;
  chapterId: number;
  chapterName?: string;
  topics: { topicId: number; topicName: string }[];
}

export interface TopicPerformanceStat {
  topicId: number;
  topicName: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface ReviewQuestionItem {
  quizQuesId: number;
  questionType: QuizQuestionType;
  quesText: string;
  options?: Record<string, string> | null;
  difficulty: QuizDifficulty;
  selectedAnswer: string | null;
  correctAnswer: string;
  acceptedAnswers?: string[] | null;
  isCorrect: boolean;
  explanation: string;
  chapterId: number;
  chapterName?: string;
  topics: { topicId: number; topicName: string }[];
}

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(QuizQuestion)
    private readonly questionRepo: Repository<QuizQuestion>,
    @InjectRepository(QuizAttempt)
    private readonly attemptRepo: Repository<QuizAttempt>,
    @InjectRepository(QuizAttemptResponse)
    private readonly responseRepo: Repository<QuizAttemptResponse>,
    @InjectRepository(Subject)
    private readonly subjectRepo: Repository<Subject>,
    @InjectRepository(Chapter)
    private readonly chapterRepo: Repository<Chapter>,
    @InjectRepository(Topic)
    private readonly topicRepo: Repository<Topic>,
    @InjectRepository(Department)
    private readonly departmentRepo: Repository<Department>,
  ) {}

  /**
   * Fetches academic hierarchy (Departments -> Subjects -> Chapters -> Topics)
   * with student email personalization metadata if available.
   */
  async getHierarchyFilters(userEmail?: string) {
    const departments = await this.departmentRepo.find({ order: { deptId: 'ASC' } });
    const subjects = await this.subjectRepo.find({
      order: { semester: 'ASC', subjectName: 'ASC' },
    });
    const chapters = await this.chapterRepo.find({
      order: { chapterNo: 'ASC' },
    });
    const topics = await this.topicRepo.find({
      order: { topicName: 'ASC' },
    });

    // Compute question count per subject to help clients pick subjects with available questions
    const subjectCountsRaw = await this.questionRepo
      .createQueryBuilder('q')
      .innerJoin(Chapter, 'ch', 'ch.chapterId = q.chapterId')
      .select('ch.subjectKey', 'subjectKey')
      .addSelect('COUNT(DISTINCT q.quizQuesId)', 'count')
      .groupBy('ch.subjectKey')
      .getRawMany<{ subjectKey: number; count: string }>();

    const subjectQuestionCounts: Record<number, number> = {};
    for (const row of subjectCountsRaw) {
      if (row.subjectKey) {
        subjectQuestionCounts[row.subjectKey] = parseInt(row.count, 10);
      }
    }

    const enrichedSubjects = subjects.map((sub) => ({
      ...sub,
      questionCount: subjectQuestionCounts[sub.subjectKey] || 0,
    }));

    let studentProfile = null;
    if (userEmail) {
      studentProfile = parseStudentEmail(userEmail);
    }

    return {
      departments,
      subjects: enrichedSubjects,
      chapters,
      topics,
      studentProfile,
      subjectQuestionCounts,
    };
  }

  /**
   * Returns live question counts matching the selected filters.
   */
  async getQuestionCounts(filters: {
    subjectKey?: number;
    chapterId?: number;
    topicIds?: number[];
    difficulty?: string;
    questionType?: string;
  }) {
    const qb = this.questionRepo.createQueryBuilder('q');

    if (filters.topicIds && filters.topicIds.length > 0) {
      qb.innerJoin(
        QuizQuestionTopic,
        'qqt',
        'qqt.quizQuesId = q.quizQuesId AND qqt.topicId IN (:...tIds)',
        { tIds: filters.topicIds },
      );
    }

    if (filters.chapterId) {
      qb.andWhere('q.chapterId = :cId', { cId: filters.chapterId });
    } else if (filters.subjectKey) {
      qb.innerJoin(Chapter, 'ch', 'ch.chapterId = q.chapterId');
      qb.andWhere('ch.subjectKey = :sKey', { sKey: filters.subjectKey });
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      qb.andWhere('q.difficulty = :diff', { diff: filters.difficulty });
    }

    if (filters.questionType && filters.questionType !== 'ALL') {
      qb.andWhere('q.questionType = :qType', { qType: filters.questionType });
    }

    const total = await qb.getCount();

    // Counts by difficulty
    const diffQb = this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'difficulty')
      .addSelect('COUNT(DISTINCT q.quizQuesId)', 'count');

    if (filters.topicIds && filters.topicIds.length > 0) {
      diffQb.innerJoin(
        QuizQuestionTopic,
        'qqt',
        'qqt.quizQuesId = q.quizQuesId AND qqt.topicId IN (:...tIds)',
        { tIds: filters.topicIds },
      );
    }

    if (filters.chapterId) {
      diffQb.andWhere('q.chapterId = :cId', { cId: filters.chapterId });
    } else if (filters.subjectKey) {
      diffQb.innerJoin(Chapter, 'ch', 'ch.chapterId = q.chapterId');
      diffQb.andWhere('ch.subjectKey = :sKey', { sKey: filters.subjectKey });
    }

    if (filters.questionType && filters.questionType !== 'ALL') {
      diffQb.andWhere('q.questionType = :qType', { qType: filters.questionType });
    }

    diffQb.groupBy('q.difficulty');
    const diffRows = await diffQb.getRawMany<{ difficulty: QuizDifficulty; count: string }>();

    const breakdown = {
      EASY: 0,
      MEDIUM: 0,
      HARD: 0,
    };

    for (const r of diffRows) {
      if (r.difficulty && r.count) {
        breakdown[r.difficulty] = parseInt(r.count, 10);
      }
    }

    // Counts by question type
    const typeQb = this.questionRepo
      .createQueryBuilder('q')
      .select('q.questionType', 'questionType')
      .addSelect('COUNT(DISTINCT q.quizQuesId)', 'count');

    if (filters.topicIds && filters.topicIds.length > 0) {
      typeQb.innerJoin(
        QuizQuestionTopic,
        'qqt',
        'qqt.quizQuesId = q.quizQuesId AND qqt.topicId IN (:...tIds)',
        { tIds: filters.topicIds },
      );
    }

    if (filters.chapterId) {
      typeQb.andWhere('q.chapterId = :cId', { cId: filters.chapterId });
    } else if (filters.subjectKey) {
      typeQb.innerJoin(Chapter, 'ch', 'ch.chapterId = q.chapterId');
      typeQb.andWhere('ch.subjectKey = :sKey', { sKey: filters.subjectKey });
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      typeQb.andWhere('q.difficulty = :diff', { diff: filters.difficulty });
    }

    typeQb.groupBy('q.questionType');
    const typeRows = await typeQb.getRawMany<{ questionType: QuizQuestionType; count: string }>();

    const typeBreakdown = {
      MCQ: 0,
      FILLUPS: 0,
      TRUE_FALSE: 0,
    };

    for (const r of typeRows) {
      if (r.questionType && r.count) {
        typeBreakdown[r.questionType] = parseInt(r.count, 10);
      }
    }

    return {
      total,
      availableQuestions: total,
      breakdown,
      typeBreakdown,
    };
  }

  /**
   * Starts a revision session:
   * Selects questions with database-level filtering + memory-efficient random sampling,
   * creates a persistent QuizAttempt record, and returns the questions without answer keys.
   */
  async startRevisionAttempt(dto: StartQuizDto, user?: SafeUser | null) {
    let questionIds: number[] = [];

    // Case 1: Retrying incorrect questions from an existing attempt
    if (dto.retryAttemptId) {
      const priorAttempt = await this.attemptRepo.findOne({
        where: user?.userId
          ? { attemptId: dto.retryAttemptId, userId: user.userId }
          : { attemptId: dto.retryAttemptId },
        relations: { responses: true },
      });

      if (!priorAttempt) {
        throw new NotFoundException('Previous attempt not found or does not belong to you.');
      }

      const incorrectResponses = (priorAttempt.responses || []).filter(
        (r) => !r.isCorrect || !r.selectedAnswer,
      );

      if (incorrectResponses.length === 0) {
        throw new BadRequestException('All questions in that attempt were answered correctly!');
      }

      questionIds = incorrectResponses.map((r) => r.quizQuesId);
      dto.subjectKey = priorAttempt.subjectKey;
      dto.chapterId = priorAttempt.chapterId || undefined;
    } else {
      // Case 2: New revision session
      const qb = this.questionRepo.createQueryBuilder('q').select('DISTINCT q.quizQuesId', 'id');

      if (dto.topicIds && dto.topicIds.length > 0) {
        qb.innerJoin(
          QuizQuestionTopic,
          'qqt',
          'qqt.quizQuesId = q.quizQuesId AND qqt.topicId IN (:...tIds)',
          { tIds: dto.topicIds },
        );
      }

      if (dto.chapterId) {
        qb.andWhere('q.chapterId = :cId', { cId: dto.chapterId });
      } else if (dto.subjectKey) {
        qb.innerJoin(Chapter, 'ch', 'ch.chapterId = q.chapterId');
        qb.andWhere('ch.subjectKey = :sKey', { sKey: dto.subjectKey });
      }

      if (dto.difficulty && dto.difficulty !== QuizDifficultyFilter.ALL) {
        qb.andWhere('q.difficulty = :diff', { diff: dto.difficulty });
      }

      if (dto.questionType && dto.questionType !== QuizTypeFilter.ALL) {
        qb.andWhere('q.questionType = :qType', { qType: dto.questionType });
      }

      const eligibleRows = await qb.getRawMany<{ id: number }>();
      const allEligibleIds = eligibleRows.map((r) => r.id);

      if (allEligibleIds.length === 0) {
        throw new BadRequestException(
          'No revision questions found matching the selected filters. Please choose another chapter, question type, or difficulty.',
        );
      }

      // Fisher-Yates partial shuffle
      const requestedLimit = dto.limit || dto.count || 10;
      const requestedCount = Math.min(requestedLimit, allEligibleIds.length);
      for (let i = allEligibleIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allEligibleIds[i], allEligibleIds[j]] = [allEligibleIds[j], allEligibleIds[i]];
      }
      questionIds = allEligibleIds.slice(0, requestedCount);
    }

    // Load full question details for chosen IDs (without exposing answer/explanation yet)
    const questions = await this.questionRepo.find({
      where: { quizQuesId: In(questionIds) },
      relations: { chapter: true, topics: { topic: true } },
    });

    // Create the persistent QuizAttempt record
    const attempt = this.attemptRepo.create({
      userId: user?.userId || null,
      subjectKey: dto.subjectKey,
      chapterId: dto.chapterId || null,
      difficulty: dto.difficulty || 'ALL',
      totalQuestions: questions.length,
      correctAnswers: 0,
      incorrectAnswers: 0,
      unanswered: questions.length,
      accuracy: 0.0,
      timeTakenSeconds: 0,
      isCompleted: false,
    });

    const savedAttempt = await this.attemptRepo.save(attempt);

    // Prepare student question list: strictly exclude correctAnswer, acceptedAnswers, and explanation
    const studentQuestions: StudentQuizQuestionView[] = questions.map((q) => ({
      quizQuesId: q.quizQuesId,
      questionType: q.questionType,
      quesText: q.quesText,
      options: q.options || (q.questionType === QuizQuestionType.TRUE_FALSE ? { TRUE: 'True', FALSE: 'False' } : null),
      difficulty: q.difficulty,
      chapterId: q.chapterId,
      chapterName: q.chapter?.chapterName,
      topics: (q.topics || [])
        .map((t) => t.topic)
        .filter((t): t is Topic => Boolean(t))
        .map((t) => ({ topicId: t.topicId, topicName: t.topicName })),
    }));

    return {
      attemptId: savedAttempt.attemptId,
      subjectKey: savedAttempt.subjectKey,
      chapterId: savedAttempt.chapterId,
      difficulty: savedAttempt.difficulty,
      totalQuestions: savedAttempt.totalQuestions,
      startedAt: savedAttempt.startedAt,
      questions: studentQuestions,
    };
  }

  /**
   * Evaluates submitted answers on the server supporting MCQ, FILLUPS, and TRUE_FALSE,
   * calculates accuracy, updates attempt, saves response rows, and returns full feedback.
   */
  async submitRevisionAttempt(dto: SubmitQuizDto, user?: SafeUser | null) {
    const attemptId = dto.attemptId;
    if (!attemptId) {
      throw new BadRequestException('attemptId must be provided.');
    }

    const whereConditions = user?.userId
      ? [{ attemptId, userId: user.userId }, { attemptId, userId: IsNull() }]
      : { attemptId };

    const attempt = await this.attemptRepo.findOne({
      where: whereConditions,
      relations: { subject: true, chapter: true },
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found or does not belong to you.');
    }

    if (attempt.isCompleted) {
      return this.getAttemptReview(attemptId, user?.userId || null);
    }

    // Associate attempt with logged-in user if started as guest
    if (user?.userId && !attempt.userId) {
      attempt.userId = user.userId;
    }

    const answersList = dto.answers || dto.responses || [];
    const questionIds = answersList.map((a) => a.quizQuesId);
    if (questionIds.length === 0) {
      throw new BadRequestException('No answer items provided in submission.');
    }

    // Load actual question entities with correct answers
    const questions = await this.questionRepo.find({
      where: { quizQuesId: In(questionIds) },
      relations: { chapter: true, topics: { topic: true } },
    });

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const answerMap = new Map<number, string | null>();
    for (const ans of answersList) {
      answerMap.set(ans.quizQuesId, ans.selectedAnswer ? String(ans.selectedAnswer).trim() : null);
    }

    const responsesToSave: {
      quizQuesId: number;
      selectedAnswer: string | null;
      isCorrect: boolean;
    }[] = [];

    const reviewItems: ReviewQuestionItem[] = [];
    const topicStatsMap = new Map<number, { name: string; total: number; correct: number }>();

    for (const q of questions) {
      const rawSelected = answerMap.get(q.quizQuesId) || null;
      let isCorrect = false;

      if (!rawSelected) {
        unansweredCount++;
      } else {
        // Grade according to questionType
        if (q.questionType === QuizQuestionType.MCQ) {
          const selectedLetter = rawSelected.trim().toUpperCase();
          const expectedLetter = q.correctAnswer.trim().toUpperCase();
          isCorrect = selectedLetter === expectedLetter;
        } else if (q.questionType === QuizQuestionType.TRUE_FALSE) {
          const normSelected = normalizeTrueFalse(rawSelected);
          const normCorrect = normalizeTrueFalse(q.correctAnswer);
          isCorrect = Boolean(normSelected && normSelected === normCorrect);
        } else if (q.questionType === QuizQuestionType.FILLUPS) {
          const normSelected = normalizeFillupAnswer(rawSelected);
          const candidates = [q.correctAnswer, ...(q.acceptedAnswers || [])];
          isCorrect = Boolean(
            normSelected &&
              candidates.some((cand) => normalizeFillupAnswer(cand) === normSelected),
          );
        }

        if (isCorrect) correctCount++;
        else incorrectCount++;
      }

      responsesToSave.push({
        quizQuesId: q.quizQuesId,
        selectedAnswer: rawSelected,
        isCorrect,
      });

      // Topic aggregation
      if (q.topics && q.topics.length > 0) {
        for (const qt of q.topics) {
          if (qt.topic) {
            const stat = topicStatsMap.get(qt.topic.topicId) || {
              name: qt.topic.topicName,
              total: 0,
              correct: 0,
            };
            stat.total++;
            if (isCorrect) stat.correct++;
            topicStatsMap.set(qt.topic.topicId, stat);
          }
        }
      }

      reviewItems.push({
        quizQuesId: q.quizQuesId,
        questionType: q.questionType,
        quesText: q.quesText,
        options: q.options || (q.questionType === QuizQuestionType.TRUE_FALSE ? { TRUE: 'True', FALSE: 'False' } : null),
        difficulty: q.difficulty,
        selectedAnswer: rawSelected,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        isCorrect,
        explanation: q.explanation,
        chapterId: q.chapterId,
        chapterName: q.chapter?.chapterName,
        topics: (q.topics || [])
          .map((t) => t.topic)
          .filter((t): t is Topic => Boolean(t))
          .map((t) => ({ topicId: t.topicId, topicName: t.topicName })),
      });
    }

    const total = questions.length;
    const accuracy = total > 0 ? parseFloat(((correctCount / total) * 100).toFixed(2)) : 0;
    const timeTaken = Math.max(0, dto.timeTakenSeconds ?? dto.timeSpentSeconds ?? 0);

    // Persist results inside a transaction
    await this.dataSource.transaction(async (manager) => {
      attempt.correctAnswers = correctCount;
      attempt.incorrectAnswers = incorrectCount;
      attempt.unanswered = unansweredCount;
      attempt.accuracy = accuracy;
      attempt.timeTakenSeconds = timeTaken;
      attempt.isCompleted = true;
      attempt.completedAt = new Date();
      await manager.save(QuizAttempt, attempt);

      const responseEntities = responsesToSave.map((r) =>
        manager.create(QuizAttemptResponse, {
          attemptId: attempt.attemptId,
          quizQuesId: r.quizQuesId,
          selectedAnswer: r.selectedAnswer,
          isCorrect: r.isCorrect,
        }),
      );
      await manager.save(QuizAttemptResponse, responseEntities);
    });

    const topicBreakdown: TopicPerformanceStat[] = Array.from(topicStatsMap.entries()).map(
      ([topicId, stat]) => ({
        topicId,
        topicName: stat.name,
        total: stat.total,
        correct: stat.correct,
        accuracy: stat.total > 0 ? parseFloat(((stat.correct / stat.total) * 100).toFixed(2)) : 0,
      }),
    );

    const mappedQuestions = reviewItems.map((q) => ({
      ...q,
      studentAnswer: q.selectedAnswer,
    }));

    return {
      attemptId: attempt.attemptId,
      status: 'COMPLETED' as const,
      subjectKey: attempt.subjectKey,
      subjectName: attempt.subject?.subjectName,
      chapterId: attempt.chapterId,
      chapterName: attempt.chapter?.chapterName,
      totalQuestions: total,
      // Traditional names
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      unanswered: unansweredCount,
      accuracy,
      timeTakenSeconds: timeTaken,
      completedAt: attempt.completedAt,
      topicBreakdown,
      // Mobile client alias names
      score: correctCount,
      accuracyPercentage: accuracy,
      correctCount,
      incorrectCount,
      unansweredCount,
      timeSpentSeconds: timeTaken,
      createdAt: attempt.completedAt ? attempt.completedAt.toISOString() : new Date().toISOString(),
      topicPerformance: topicBreakdown,
      questions: mappedQuestions,
    };
  }

  /**
   * Fetches full review of a completed attempt.
   */
  async getAttemptReview(attemptId: number, userId?: number | null) {
    const attempt = await this.attemptRepo.findOne({
      where: userId ? { attemptId, userId } : { attemptId },
      relations: {
        subject: true,
        chapter: true,
        responses: {
          question: {
            chapter: true,
            topics: { topic: true },
          },
        },
      },
    });

    if (!attempt) {
      throw new NotFoundException('Attempt not found or access denied.');
    }

    const reviewItems: ReviewQuestionItem[] = [];
    const topicStatsMap = new Map<number, { name: string; total: number; correct: number }>();

    for (const resp of attempt.responses || []) {
      const q = resp.question;
      if (!q) continue;

      if (q.topics && q.topics.length > 0) {
        for (const qt of q.topics) {
          if (qt.topic) {
            const stat = topicStatsMap.get(qt.topic.topicId) || {
              name: qt.topic.topicName,
              total: 0,
              correct: 0,
            };
            stat.total++;
            if (resp.isCorrect) stat.correct++;
            topicStatsMap.set(qt.topic.topicId, stat);
          }
        }
      }

      reviewItems.push({
        quizQuesId: q.quizQuesId,
        questionType: q.questionType,
        quesText: q.quesText,
        options: q.options || (q.questionType === QuizQuestionType.TRUE_FALSE ? { TRUE: 'True', FALSE: 'False' } : null),
        difficulty: q.difficulty,
        selectedAnswer: resp.selectedAnswer ?? null,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        isCorrect: resp.isCorrect,
        explanation: q.explanation,
        chapterId: q.chapterId,
        chapterName: q.chapter?.chapterName,
        topics: (q.topics || [])
          .map((t) => t.topic)
          .filter((t): t is Topic => Boolean(t))
          .map((t) => ({ topicId: t.topicId, topicName: t.topicName })),
      });
    }

    const topicBreakdown: TopicPerformanceStat[] = Array.from(topicStatsMap.entries()).map(
      ([topicId, stat]) => ({
        topicId,
        topicName: stat.name,
        total: stat.total,
        correct: stat.correct,
        accuracy: stat.total > 0 ? parseFloat(((stat.correct / stat.total) * 100).toFixed(2)) : 0,
      }),
    );

    const mappedQuestions = reviewItems.map((q) => ({
      ...q,
      studentAnswer: q.selectedAnswer,
    }));

    return {
      attemptId: attempt.attemptId,
      status: 'COMPLETED' as const,
      subjectKey: attempt.subjectKey,
      subjectName: attempt.subject?.subjectName,
      chapterId: attempt.chapterId,
      chapterName: attempt.chapter?.chapterName,
      totalQuestions: attempt.totalQuestions,
      // Traditional names
      correctAnswers: attempt.correctAnswers,
      incorrectAnswers: attempt.incorrectAnswers,
      unanswered: attempt.unanswered,
      accuracy: Number(attempt.accuracy),
      timeTakenSeconds: attempt.timeTakenSeconds,
      completedAt: attempt.completedAt,
      topicBreakdown,
      // Mobile client alias names
      score: attempt.correctAnswers,
      accuracyPercentage: Number(attempt.accuracy),
      correctCount: attempt.correctAnswers,
      incorrectCount: attempt.incorrectAnswers,
      unansweredCount: attempt.unanswered,
      timeSpentSeconds: attempt.timeTakenSeconds,
      createdAt: attempt.completedAt ? attempt.completedAt.toISOString() : new Date().toISOString(),
      topicPerformance: topicBreakdown,
      questions: mappedQuestions,
    };
  }

  /**
   * Fetches paginated past revision attempts for the authenticated student.
   */
  async getUserAttemptHistory(userId: number, page = 1, limit = 10) {
    const [attempts, total] = await this.attemptRepo.findAndCount({
      where: userId ? { userId, isCompleted: true } : { isCompleted: true },
      relations: { subject: true, chapter: true },
      order: { completedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const mappedAttempts = attempts.map((a) => ({
      attemptId: a.attemptId,
      status: 'COMPLETED' as const,
      subjectKey: a.subjectKey,
      subjectName: a.subject?.subjectName,
      chapterId: a.chapterId,
      chapterName: a.chapter?.chapterName,
      difficulty: a.difficulty,
      totalQuestions: a.totalQuestions,
      // Traditional names
      correctAnswers: a.correctAnswers,
      incorrectAnswers: a.incorrectAnswers,
      unanswered: a.unanswered,
      accuracy: Number(a.accuracy),
      timeTakenSeconds: a.timeTakenSeconds,
      completedAt: a.completedAt,
      hasIncorrect: a.incorrectAnswers > 0 || a.unanswered > 0,
      // Mobile client alias names
      score: a.correctAnswers,
      accuracyPercentage: Number(a.accuracy),
      correctCount: a.correctAnswers,
      incorrectCount: a.incorrectAnswers,
      unansweredCount: a.unanswered,
      timeSpentSeconds: a.timeTakenSeconds,
      createdAt: a.completedAt ? a.completedAt.toISOString() : new Date().toISOString(),
    }));

    return {
      attempts: mappedAttempts,
      items: mappedAttempts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ================= ADMIN OPERATIONS =================

  async adminFindQuestions(query: AdminQuizQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const qb = this.questionRepo
      .createQueryBuilder('q')
      .leftJoinAndSelect('q.chapter', 'ch')
      .leftJoinAndSelect('ch.subject', 'sub')
      .leftJoinAndSelect('q.topics', 'qt')
      .leftJoinAndSelect('qt.topic', 't');

    if (query.search?.trim()) {
      qb.andWhere('(q.quesText LIKE :s OR q.explanation LIKE :s)', {
        s: `%${query.search.trim()}%`,
      });
    }

    if (query.chapterId) {
      qb.andWhere('q.chapterId = :cId', { cId: query.chapterId });
    } else if (query.subjectKey) {
      qb.andWhere('ch.subjectKey = :sKey', { sKey: query.subjectKey });
    }

    if (query.topicId) {
      qb.andWhere('qt.topicId = :tId', { tId: query.topicId });
    }

    if (query.difficulty) {
      qb.andWhere('q.difficulty = :diff', { diff: query.difficulty });
    }

    if (query.questionType) {
      qb.andWhere('q.questionType = :qType', { qType: query.questionType });
    }

    qb.orderBy('q.quizQuesId', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items: items.map((q) => ({
        quizQuesId: q.quizQuesId,
        questionType: q.questionType,
        quesText: q.quesText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        acceptedAnswers: q.acceptedAnswers,
        explanation: q.explanation,
        difficulty: q.difficulty,
        chapterId: q.chapterId,
        chapterName: q.chapter?.chapterName,
        subjectKey: q.chapter?.subjectKey,
        subjectName: q.chapter?.subject?.subjectName,
        topics: (q.topics || []).map((t) => t.topic).filter(Boolean),
        modelName: q.modelName,
        batchId: q.batchId,
        createdAt: q.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async adminFindOne(id: number) {
    const question = await this.questionRepo.findOne({
      where: { quizQuesId: id },
      relations: { chapter: { subject: true }, topics: { topic: true } },
    });

    if (!question) {
      throw new NotFoundException(`Quiz question #${id} not found.`);
    }

    return question;
  }

  async adminUpdateQuestion(id: number, dto: UpdateQuizQuestionDto) {
    const question = await this.adminFindOne(id);

    if (dto.questionType !== undefined) question.questionType = dto.questionType;
    if (dto.quesText !== undefined) question.quesText = dto.quesText.trim();
    if (dto.explanation !== undefined) question.explanation = dto.explanation.trim();
    if (dto.difficulty !== undefined) question.difficulty = dto.difficulty;
    if (dto.correctAnswer !== undefined) question.correctAnswer = dto.correctAnswer.trim();

    if (dto.acceptedAnswers !== undefined) {
      question.acceptedAnswers = Array.isArray(dto.acceptedAnswers)
        ? dto.acceptedAnswers.map((s) => s.trim()).filter(Boolean)
        : null;
    }

    if (dto.options !== undefined) {
      if (Array.isArray(dto.options)) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
        const map: Record<string, string> = {};
        dto.options.forEach((opt, idx) => {
          map[letters[idx] || String(idx + 1)] = String(opt).trim();
        });
        question.options = map;
      } else {
        question.options = dto.options;
      }
    }

    if (dto.chapterId !== undefined) {
      const chapter = await this.chapterRepo.findOneBy({ chapterId: dto.chapterId });
      if (!chapter) {
        throw new BadRequestException(`Chapter #${dto.chapterId} does not exist.`);
      }
      question.chapterId = dto.chapterId;
    }

    await this.questionRepo.save(question);

    if (dto.topicIds !== undefined && Array.isArray(dto.topicIds)) {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(QuizQuestionTopic, { quizQuesId: id });
        if (dto.topicIds && dto.topicIds.length > 0) {
          const links = dto.topicIds.map((tid) =>
            manager.create(QuizQuestionTopic, {
              quizQuesId: id,
              topicId: tid,
            }),
          );
          await manager.save(QuizQuestionTopic, links);
        }
      });
    }

    return this.adminFindOne(id);
  }

  async adminDeleteQuestion(id: number) {
    const question = await this.adminFindOne(id);
    await this.questionRepo.remove(question);
    return { success: true, message: `Quiz question #${id} deleted successfully.` };
  }
}
