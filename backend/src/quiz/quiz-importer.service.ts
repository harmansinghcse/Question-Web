import { Injectable, Logger } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import * as crypto from 'crypto';
import { QuizQuestion, QuizDifficulty, QuizQuestionType } from './entities/quiz-question.entity';
import { QuizQuestionTopic } from './entities/quiz-question-topic.entity';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Topic } from '../topics/entities/topic.entity';
import { ImportQuizQuestionsDto, RawImportQuestionDto } from './dto/import-quiz-questions.dto';

export interface ImportReportItem {
  index: number;
  quesTextSnippet: string;
  reason: string;
}

export interface ImportResultReport {
  totalReceived: number;
  inserted: number;
  skippedDuplicates: number;
  failedValidation: number;
  errors: ImportReportItem[];
}

@Injectable()
export class QuizImporterService {
  private readonly logger = new Logger(QuizImporterService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Generates a deterministic hash for duplicate detection based on chapter, type, and text.
   */
  public generateContentHash(chapterId: number, type: QuizQuestionType, quesText: string): string {
    const normalized = `${chapterId}::${type}::${quesText.trim().toLowerCase().replace(/\s+/g, ' ')}`;
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Normalizes options into standard { "A": "...", "B": "...", ... } format.
   */
  public normalizeOptions(raw?: Record<string, string> | string[] | null): Record<string, string> {
    if (!raw) return {};
    const result: Record<string, string> = {};

    if (Array.isArray(raw)) {
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      raw.forEach((val, idx) => {
        const key = letters[idx] || String(idx + 1);
        result[key] = String(val || '').trim();
      });
    } else if (typeof raw === 'object' && raw !== null) {
      for (const [key, val] of Object.entries(raw)) {
        result[key.trim().toUpperCase()] = String(val || '').trim();
      }
    }
    return result;
  }

  /**
   * Imports a batch of AI-generated questions safely supporting MCQ, FILLUPS, and TRUE_FALSE.
   */
  async importBatch(dto: ImportQuizQuestionsDto): Promise<ImportResultReport> {
    const report: ImportResultReport = {
      totalReceived: dto.questions?.length || 0,
      inserted: 0,
      skippedDuplicates: 0,
      failedValidation: 0,
      errors: [],
    };

    if (!dto.questions || dto.questions.length === 0) {
      return report;
    }

    // 1. Collect all distinct chapterIds and topicIds from incoming payload
    const chapterIds = new Set<number>();
    const topicIds = new Set<number>();

    for (const q of dto.questions) {
      if (q.chapterId) chapterIds.add(Number(q.chapterId));
      if (Array.isArray(q.topicIds)) {
        for (const t of q.topicIds) {
          if (t) topicIds.add(Number(t));
        }
      }
    }

    // 2. Fetch existing chapters and topics in bulk for efficient validation
    const validChapters = new Map<number, Chapter>();
    if (chapterIds.size > 0) {
      const chapters = await this.dataSource.manager.find(Chapter, {
        where: { chapterId: In(Array.from(chapterIds)) },
      });
      for (const c of chapters) validChapters.set(c.chapterId, c);
    }

    const validTopics = new Map<number, Topic>();
    if (topicIds.size > 0) {
      const topics = await this.dataSource.manager.find(Topic, {
        where: { topicId: In(Array.from(topicIds)) },
      });
      for (const t of topics) validTopics.set(t.topicId, t);
    }

    // 3. Compute hashes and check existing duplicates in DB
    const hashes: string[] = [];
    for (const q of dto.questions) {
      const text = q.quesText || q.questionText;
      const type = q.questionType || QuizQuestionType.MCQ;
      if (q.chapterId && text) {
        hashes.push(this.generateContentHash(Number(q.chapterId), type, text));
      }
    }

    const existingHashes = new Set<string>();
    if (hashes.length > 0) {
      const existing = await this.dataSource.manager.find(QuizQuestion, {
        select: { contentHash: true },
        where: { contentHash: In(hashes) },
      });
      for (const e of existing) {
        if (e.contentHash) existingHashes.add(e.contentHash);
      }
    }

    const seenBatchHashes = new Set<string>();

    // 4. Process each question
    for (let i = 0; i < dto.questions.length; i++) {
      const item: RawImportQuestionDto = dto.questions[i];
      const text = (item.quesText || item.questionText || '').trim();
      const snippet = text ? text.substring(0, 60) + '...' : `[Item ${i}]`;
      const type = item.questionType || QuizQuestionType.MCQ;

      // Basic field checks
      if (!text) {
        report.failedValidation++;
        report.errors.push({
          index: i,
          quesTextSnippet: snippet,
          reason: 'Question text is empty.',
        });
        continue;
      }

      if (!item.chapterId || !validChapters.has(Number(item.chapterId))) {
        report.failedValidation++;
        report.errors.push({
          index: i,
          quesTextSnippet: snippet,
          reason: `Invalid chapterId: ${item.chapterId} does not exist in Chapter table.`,
        });
        continue;
      }

      if (!item.explanation?.trim()) {
        report.failedValidation++;
        report.errors.push({
          index: i,
          quesTextSnippet: snippet,
          reason: 'Explanation is required for revision learning.',
        });
        continue;
      }

      // Type-specific validation
      let finalOptions: Record<string, string> | null = null;
      let finalCorrectAnswer = '';
      let finalAcceptedAnswers: string[] | null = null;

      if (type === QuizQuestionType.MCQ) {
        const normalizedOptions = this.normalizeOptions(item.options);
        const optionKeys = Object.keys(normalizedOptions);
        if (optionKeys.length < 2) {
          report.failedValidation++;
          report.errors.push({
            index: i,
            quesTextSnippet: snippet,
            reason: `MCQ requires at least 2 options, found ${optionKeys.length}.`,
          });
          continue;
        }

        const normalizedAnswer = String(item.correctAnswer || '').trim().toUpperCase();
        if (!optionKeys.includes(normalizedAnswer)) {
          report.failedValidation++;
          report.errors.push({
            index: i,
            quesTextSnippet: snippet,
            reason: `MCQ correct answer "${item.correctAnswer}" does not match any option key (${optionKeys.join(', ')}).`,
          });
          continue;
        }

        finalOptions = normalizedOptions;
        finalCorrectAnswer = normalizedAnswer;
      } else if (type === QuizQuestionType.FILLUPS) {
        // Collect accepted answers from array or fallback to correctAnswer
        const rawAccepted = Array.isArray(item.acceptedAnswers)
          ? item.acceptedAnswers.map((s) => String(s || '').trim()).filter(Boolean)
          : [];

        let primaryAns = String(item.correctAnswer || '').trim();
        if (!primaryAns && rawAccepted.length > 0) {
          primaryAns = rawAccepted[0];
        }

        if (!primaryAns) {
          report.failedValidation++;
          report.errors.push({
            index: i,
            quesTextSnippet: snippet,
            reason: 'Fill-in-the-blanks question requires at least one accepted answer or correctAnswer.',
          });
          continue;
        }

        // Ensure primaryAns is in acceptedAnswers
        const acceptedSet = new Set(rawAccepted);
        acceptedSet.add(primaryAns);

        finalCorrectAnswer = primaryAns;
        finalAcceptedAnswers = Array.from(acceptedSet);
        finalOptions = null;
      } else if (type === QuizQuestionType.TRUE_FALSE) {
        let boolAnswer: boolean | null = null;
        if (typeof item.correctAnswer === 'boolean') {
          boolAnswer = item.correctAnswer;
        } else if (typeof item.correctAnswer === 'string') {
          const s = item.correctAnswer.trim().toUpperCase();
          if (s === 'TRUE' || s === 'T' || s === '1' || s === 'YES') boolAnswer = true;
          else if (s === 'FALSE' || s === 'F' || s === '0' || s === 'NO') boolAnswer = false;
        }

        if (boolAnswer === null) {
          report.failedValidation++;
          report.errors.push({
            index: i,
            quesTextSnippet: snippet,
            reason: `True/False question requires a boolean correctAnswer (true or false), received "${item.correctAnswer}".`,
          });
          continue;
        }

        finalCorrectAnswer = boolAnswer ? 'TRUE' : 'FALSE';
        finalOptions = { TRUE: 'True', FALSE: 'False' };
      } else {
        report.failedValidation++;
        report.errors.push({
          index: i,
          quesTextSnippet: snippet,
          reason: `Unsupported questionType: ${type}. Expected MCQ, FILLUPS, or TRUE_FALSE.`,
        });
        continue;
      }

      // Topic hierarchy check
      const validQuestionTopicIds: number[] = [];
      let topicMismatch = false;

      if (Array.isArray(item.topicIds) && item.topicIds.length > 0) {
        for (const tid of item.topicIds) {
          const tNum = Number(tid);
          const topicEntity = validTopics.get(tNum);
          if (!topicEntity) {
            report.failedValidation++;
            report.errors.push({
              index: i,
              quesTextSnippet: snippet,
              reason: `Topic ID ${tNum} does not exist in Topic table.`,
            });
            topicMismatch = true;
            break;
          }
          if (topicEntity.chapterId !== Number(item.chapterId)) {
            report.failedValidation++;
            report.errors.push({
              index: i,
              quesTextSnippet: snippet,
              reason: `Topic ID ${tNum} (${topicEntity.topicName}) belongs to Chapter ${topicEntity.chapterId}, not Chapter ${item.chapterId}. Hierarchy violation.`,
            });
            topicMismatch = true;
            break;
          }
          validQuestionTopicIds.push(tNum);
        }
      }

      if (topicMismatch) continue;

      // Duplicate check
      const hash = this.generateContentHash(Number(item.chapterId), type, text);
      if (existingHashes.has(hash) || seenBatchHashes.has(hash)) {
        report.skippedDuplicates++;
        report.errors.push({
          index: i,
          quesTextSnippet: snippet,
          reason: 'Duplicate question detected. Skipped.',
        });
        continue;
      }

      // Insert question & topics in transaction
      try {
        await this.dataSource.transaction(async (manager) => {
          const question = manager.create(QuizQuestion, {
            quesText: text,
            questionType: type,
            options: finalOptions,
            correctAnswer: finalCorrectAnswer,
            acceptedAnswers: finalAcceptedAnswers,
            explanation: item.explanation.trim(),
            difficulty: item.difficulty || QuizDifficulty.MEDIUM,
            chapterId: Number(item.chapterId),
            contentHash: hash,
            modelName: dto.modelName || null,
            batchId: dto.batchId || null,
          });

          const saved = await manager.save(QuizQuestion, question);

          if (validQuestionTopicIds.length > 0) {
            const topicRows = validQuestionTopicIds.map((tId) =>
              manager.create(QuizQuestionTopic, {
                quizQuesId: saved.quizQuesId,
                topicId: tId,
              }),
            );
            await manager.save(QuizQuestionTopic, topicRows);
          }
        });

        seenBatchHashes.add(hash);
        report.inserted++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown database error';
        this.logger.error(`Failed to insert question at index ${i}: ${msg}`);
        report.failedValidation++;
        report.errors.push({
          index: i,
          quesTextSnippet: snippet,
          reason: `Database error: ${msg}`,
        });
      }
    }

    return report;
  }
}
