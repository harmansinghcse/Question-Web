import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { Question } from './entities/question.entity';
import { QuestionImage } from './entities/question-image.entity';
import { QuestionTopic } from './entities/question-topic.entity';

export interface CreatedQuestion {
  quesId: number;
  quesText: string;
  quesType: string;
  sourceId: number;
  topicIds: number[];
  imageUrls: string[];
}

export interface QuestionTopicItem {
  topicId: number;
  topicName: string;
  chapterId: number;
}

export interface QuestionImageItem {
  imageId: number;
  imageUrl: string;
  displayOrder: number;
}

export interface QuestionWithTopics {
  quesId: number;
  quesText: string;
  quesType: string;
  sourceId: number;
  topics: QuestionTopicItem[];
  images: QuestionImageItem[];
}

export interface QuestionSourceDetail {
  sourceId: number;
  sourceType: 'EXAM' | 'BOOK';
  label: string;
  examType?: string | null;
  examYear?: number | null;
  semesterNo?: number | null;
  bookName?: string | null;
  authorName?: string | null;
}

export interface QuestionDetail {
  quesId: number;
  quesText: string;
  quesType: string;
  sourceId: number;
  source: QuestionSourceDetail | null;
  chapter: {
    chapterId: number;
    chapterNo: number;
    chapterName: string;
  } | null;
  subject: {
    subjectKey: number;
    subjectId: string;
    subjectName: string | null;
    semester: number;
  } | null;
  topics: QuestionTopicItem[];
  images: QuestionImageItem[];
}

interface RawSourceRow {
  sourceId: number;
  sourceType: 'EXAM' | 'BOOK';
  examType: string | null;
  examYear: number | null;
  semesterNo: number | null;
  subjectName: string | null;
  bookName: string | null;
  authorName: string | null;
}

@Injectable()
export class QuestionsService {
  private readonly logger = new Logger(QuestionsService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Retrieves all questions along with their associated topics and images.
   */
  async findAll(): Promise<QuestionWithTopics[]> {
    try {
      const questions = await this.dataSource.manager.find(Question, {
        order: { quesId: 'DESC' },
      });

      if (questions.length === 0) {
        return [];
      }

      const [questionTopics, allImages] = await Promise.all([
        this.dataSource.manager.find(QuestionTopic),
        this.dataSource.manager.find(QuestionImage, {
          order: { imageId: 'ASC' },
        }),
      ]);

      const allTopicIds = Array.from(
        new Set(questionTopics.map((qt) => qt.topicId)),
      );

      const topics =
        allTopicIds.length > 0
          ? await this.dataSource.manager.find(Topic, {
              where: { topicId: In(allTopicIds) },
            })
          : [];

      const topicMap = new Map<number, Topic>(
        topics.map((t) => [t.topicId, t]),
      );

      const topicsByQuestion = new Map<number, QuestionTopicItem[]>();
      for (const qt of questionTopics) {
        const t = topicMap.get(qt.topicId);
        if (t) {
          const list = topicsByQuestion.get(qt.quesId) ?? [];
          list.push({
            topicId: t.topicId,
            topicName: t.topicName,
            chapterId: t.chapterId,
          });
          topicsByQuestion.set(qt.quesId, list);
        }
      }

      const imagesByQuestion = new Map<number, QuestionImageItem[]>();
      for (const img of allImages) {
        const list = imagesByQuestion.get(img.quesId) ?? [];
        list.push({
          imageId: img.imageId,
          imageUrl: img.imageUrl,
          displayOrder: list.length,
        });
        imagesByQuestion.set(img.quesId, list);
      }

      return questions.map((q) => ({
        quesId: q.quesId,
        quesText: q.quesText,
        quesType: q.quesType,
        sourceId: q.sourceId,
        topics: topicsByQuestion.get(q.quesId) ?? [],
        images: imagesByQuestion.get(q.quesId) ?? [],
      }));
    } catch (error: unknown) {
      this.logger.error(
        'Failed to fetch questions',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to fetch questions');
    }
  }

  /**
   * Retrieves complete details for a single question including
   * subject, chapter, topics, source metadata, and ordered images.
   */
  async findOne(id: number): Promise<QuestionDetail> {
    try {
      const question = await this.dataSource.manager.findOne(Question, {
        where: { quesId: id },
      });

      if (!question) {
        throw new NotFoundException(`Question #${id} not found`);
      }

      // 1. Fetch images ordered by imageId (insertion sequence)
      const images = await this.dataSource.manager.find(QuestionImage, {
        where: { quesId: id },
        order: { imageId: 'ASC' },
      });

      // 2. Fetch associated topics
      const questionTopics = await this.dataSource.manager.find(QuestionTopic, {
        where: { quesId: id },
      });

      const topicIds = questionTopics.map((qt) => qt.topicId);
      const topics: Topic[] =
        topicIds.length > 0
          ? await this.dataSource.manager.find(Topic, {
              where: { topicId: In(topicIds) },
            })
          : [];

      // 3. Hydrate Chapter and Subject from the first available topic
      let chapterData: {
        chapterId: number;
        chapterNo: number;
        chapterName: string;
      } | null = null;
      let subjectData: {
        subjectKey: number;
        subjectId: string;
        subjectName: string | null;
        semester: number;
      } | null = null;

      if (topics.length > 0) {
        const firstTopic = topics[0];
        const chapter = await this.dataSource.manager.findOne(Chapter, {
          where: { chapterId: firstTopic.chapterId },
        });

        if (chapter) {
          chapterData = {
            chapterId: chapter.chapterId,
            chapterNo: chapter.chapterNo,
            chapterName: chapter.chapterName,
          };

          if (chapter.subjectKey) {
            const subject = await this.dataSource.manager.findOne(Subject, {
              where: { subjectKey: chapter.subjectKey },
            });
            if (subject) {
              subjectData = {
                subjectKey: subject.subjectKey,
                subjectId: subject.subjectId,
                subjectName: subject.subjectName,
                semester: subject.semester,
              };
            }
          }
        }
      }

      // 4. Hydrate Source details
      let sourceData: QuestionSourceDetail | null = null;
      if (question.sourceId) {
        const sourceRows: RawSourceRow[] = await this.dataSource.query(
          `SELECT s.SourceID AS sourceId, s.SourceType AS sourceType,
                  e.ExamType AS examType, e.ExamYear AS examYear,
                  e.SemesterNo AS semesterNo, sub.subjectName AS subjectName,
                  b.BookName AS bookName, b.AuthorName AS authorName
             FROM \`Source\` s
             LEFT JOIN \`Exam\` e ON e.SourceID = s.SourceID
             LEFT JOIN \`Subject\` sub ON sub.subjectKey = e.subjectKey
             LEFT JOIN \`Book\` b ON b.SourceID = s.SourceID
            WHERE s.SourceID = ?
            LIMIT 1`,
          [question.sourceId],
        );

        if (sourceRows.length > 0) {
          const r = sourceRows[0];
          let label = `Source #${r.sourceId}`;
          if (r.sourceType === 'BOOK') {
            const base = r.bookName ?? `Book #${r.sourceId}`;
            label = r.authorName ? `${base} — ${r.authorName}` : base;
          } else {
            const parts = [
              [r.examType, r.examYear].filter(Boolean).join(' '),
              r.semesterNo != null ? `Semester ${r.semesterNo}` : null,
              r.subjectName,
            ].filter(Boolean);
            label =
              parts.length > 0 ? `Exam: ${parts.join(' · ')}` : `Exam #${r.sourceId}`;
          }

          sourceData = {
            sourceId: Number(r.sourceId),
            sourceType: r.sourceType,
            label,
            examType: r.examType,
            examYear: r.examYear ? Number(r.examYear) : null,
            semesterNo: r.semesterNo ? Number(r.semesterNo) : null,
            bookName: r.bookName,
            authorName: r.authorName,
          };
        }
      }

      return {
        quesId: question.quesId,
        quesText: question.quesText,
        quesType: question.quesType,
        sourceId: question.sourceId,
        source: sourceData,
        chapter: chapterData,
        subject: subjectData,
        topics: topics.map((t) => ({
          topicId: t.topicId,
          topicName: t.topicName,
          chapterId: t.chapterId,
        })),
        images: images.map((img, idx) => ({
          imageId: img.imageId,
          imageUrl: img.imageUrl,
          displayOrder: idx,
        })),
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Failed to fetch question #${id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(`Failed to fetch question #${id}`);
    }
  }

  /**
   * Creates a Question, its QuestionTopic rows, and its QuestionImage rows in ONE transaction.
   * Any failure rolls back the question, every topic link, and every image link.
   */
  async create(dto: CreateQuestionDto): Promise<CreatedQuestion> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const sources: unknown[] = await manager.query(
          'SELECT `SourceID` FROM `Source` WHERE `SourceID` = ?',
          [dto.sourceId],
        );
        if (sources.length === 0) {
          throw new BadRequestException(
            `Source with ID ${dto.sourceId} does not exist`,
          );
        }

        const existing = await manager.find(Topic, {
          select: { topicId: true },
          where: { topicId: In(dto.topicIds) },
        });
        const existingIds = new Set(existing.map((t) => t.topicId));
        const missing = dto.topicIds.filter((id) => !existingIds.has(id));
        if (missing.length > 0) {
          throw new BadRequestException(
            `Topic ID(s) do not exist: ${missing.join(', ')}`,
          );
        }

        const inserted = await manager.insert(Question, {
          quesText: dto.quesText,
          quesType: dto.quesType,
          sourceId: dto.sourceId,
        });
        const quesId = Number((inserted.identifiers[0] as Question).quesId);

        await manager.insert(
          QuestionTopic,
          dto.topicIds.map((topicId) => ({ quesId, topicId })),
        );

        // Atomically insert attached images into the existing QuestionImage table
        const validUrls = (dto.imageUrls ?? []).filter(
          (url) => typeof url === 'string' && url.trim().length > 0,
        );

        if (validUrls.length > 0) {
          await manager.insert(
            QuestionImage,
            validUrls.map((imageUrl) => ({
              quesId,
              imageUrl: imageUrl.trim(),
            })),
          );
        }

        return {
          quesId,
          quesText: dto.quesText,
          quesType: dto.quesType,
          sourceId: dto.sourceId,
          topicIds: dto.topicIds,
          imageUrls: validUrls,
        };
      });
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;

      // Foreign-key backstop (e.g. a row deleted between check and insert).
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'ER_NO_REFERENCED_ROW_2' ||
          error.code === 'ER_NO_REFERENCED_ROW')
      ) {
        throw new BadRequestException(
          'Source or topic reference is invalid; nothing was saved',
        );
      }

      this.logger.error(
        'Failed to create question',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to save the question; nothing was saved',
      );
    }
  }
}
