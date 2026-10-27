import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Subject } from '../subjects/entities/subject.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateExamDto } from './dto/create-exam.dto';
import { CreateSourceDto } from './dto/create-source.dto';
import { Book } from './entities/book.entity';
import { Exam } from './entities/exam.entity';
import { Source } from './entities/source.entity';

export interface SourceSummary {
  sourceId: number;
  sourceType: 'EXAM' | 'BOOK';
  label: string;
  examType?: string | null;
  examYear?: number | null;
  semesterNo?: number | null;
  subjectKey?: number | null;
  subjectName?: string | null;
  subjectId?: string | null;
  month?: string | null;
  bookName?: string | null;
  authorName?: string | null;
  questionCount?: number;
}

export interface ExamItem {
  sourceId: number;
  examType: string;
  examYear: number;
  semesterNo: number;
  subjectKey: number;
  month: string | null;
  subjectName?: string | null;
  subjectId?: string | null;
  deptId?: number | null;
  deptName?: string | null;
  label: string;
  questionCount?: number;
}

export interface BookItem {
  sourceId: number;
  bookName: string;
  authorName: string;
  label: string;
  questionCount?: number;
}

interface SourceRow {
  sourceId: number;
  sourceType: 'EXAM' | 'BOOK';
  examType: string | null;
  examYear: number | null;
  semesterNo: number | null;
  subjectKey: number | null;
  subjectName: string | null;
  subjectId: string | null;
  deptId: number | null;
  deptName: string | null;
  month: string | null;
  bookName: string | null;
  authorName: string | null;
  questionCount: number | null;
}

@Injectable()
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** List of ALL sources (Source + Exam/Book details + question count). */
  async findAll(): Promise<SourceSummary[]> {
    try {
      const rows: SourceRow[] = await this.dataSource.query(
        `SELECT s.SourceID AS sourceId, s.SourceType AS sourceType,
                e.ExamType AS examType, e.ExamYear AS examYear,
                e.SemesterNo AS semesterNo, e.subjectKey AS subjectKey,
                e.Month AS month,
                sub.subjectName AS subjectName, sub.subjectId AS subjectId,
                sub.deptId AS deptId, dept.deptName AS deptName,
                b.BookName AS bookName, b.AuthorName AS authorName,
                (SELECT COUNT(*) FROM \`Question\` q WHERE q.SourceID = s.SourceID) AS questionCount
           FROM \`Source\` s
           LEFT JOIN \`Exam\` e ON e.SourceID = s.SourceID
           LEFT JOIN \`Subject\` sub ON sub.subjectKey = e.subjectKey
           LEFT JOIN \`Department\` dept ON dept.deptId = sub.deptId
           LEFT JOIN \`Book\` b ON b.SourceID = s.SourceID
          ORDER BY s.SourceID DESC`,
      );

      return rows.map((r) => ({
        sourceId: Number(r.sourceId),
        sourceType: r.sourceType,
        label: this.buildLabel(r),
        examType: r.examType,
        examYear: r.examYear ? Number(r.examYear) : null,
        semesterNo: r.semesterNo ? Number(r.semesterNo) : null,
        subjectKey: r.subjectKey ? Number(r.subjectKey) : null,
        subjectName: r.subjectName,
        subjectId: r.subjectId,
        month: r.month,
        bookName: r.bookName,
        authorName: r.authorName,
        questionCount: Number(r.questionCount || 0),
      }));
    } catch (error: unknown) {
      this.logger.error(
        'Failed to load sources',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Unable to load sources');
    }
  }

  /** Create a raw Source record */
  async createSource(dto: CreateSourceDto): Promise<{ sourceId: number; sourceType: 'EXAM' | 'BOOK' }> {
    try {
      const result = await this.dataSource.manager.insert(Source, {
        sourceType: dto.sourceType,
      });
      const sourceId = Number((result.identifiers[0] as Source).sourceId);
      return {
        sourceId,
        sourceType: dto.sourceType,
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to create source',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Failed to create source record');
    }
  }

  /** List of registered exams, optionally filtered by subjectKey */
  async findAllExams(subjectKey?: number): Promise<ExamItem[]> {
    try {
      let query = `
        SELECT e.SourceID AS sourceId, e.ExamType AS examType, e.ExamYear AS examYear,
               e.SemesterNo AS semesterNo, e.subjectKey AS subjectKey, e.Month AS month,
               sub.subjectName AS subjectName, sub.subjectId AS subjectId,
               sub.deptId AS deptId, dept.deptName AS deptName,
               (SELECT COUNT(*) FROM \`Question\` q WHERE q.SourceID = e.SourceID) AS questionCount
          FROM \`Exam\` e
          JOIN \`Source\` s ON s.SourceID = e.SourceID
          LEFT JOIN \`Subject\` sub ON sub.subjectKey = e.subjectKey
          LEFT JOIN \`Department\` dept ON dept.deptId = sub.deptId
      `;

      const params: unknown[] = [];
      if (subjectKey !== undefined && !Number.isNaN(subjectKey)) {
        query += ' WHERE e.subjectKey = ?';
        params.push(subjectKey);
      }

      query += ' ORDER BY e.ExamYear DESC, e.SemesterNo DESC, e.SourceID DESC';

      const rows: SourceRow[] = await this.dataSource.query(query, params);

      return rows.map((r) => ({
        sourceId: Number(r.sourceId),
        examType: r.examType ?? 'EXAM',
        examYear: Number(r.examYear),
        semesterNo: Number(r.semesterNo),
        subjectKey: Number(r.subjectKey),
        month: r.month,
        subjectName: r.subjectName,
        subjectId: r.subjectId,
        deptId: r.deptId ? Number(r.deptId) : null,
        deptName: r.deptName,
        label: this.buildLabel(r),
        questionCount: Number(r.questionCount || 0),
      }));
    } catch (error: unknown) {
      this.logger.error(
        'Failed to load exams',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Unable to load exams');
    }
  }

  /**
   * Creates a Source record of type EXAM and its associated Exam record atomically in a transaction.
   * Prevents orphaned records.
   */
  async createExam(dto: CreateExamDto): Promise<ExamItem> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. Verify subject exists
      const subject = await manager.findOne(Subject, {
        where: { subjectKey: dto.subjectKey },
      });
      if (!subject) {
        throw new NotFoundException(`Subject with ID ${dto.subjectKey} does not exist`);
      }

      // 2. Prevent duplicate exam entry
      let dupQuery = `
        SELECT e.SourceID AS sourceId FROM \`Exam\` e
         WHERE e.subjectKey = ? AND e.ExamType = ? AND e.ExamYear = ? AND e.SemesterNo = ?
      `;
      const dupParams: unknown[] = [
        dto.subjectKey,
        dto.examType,
        dto.examYear,
        dto.semesterNo,
      ];

      if (dto.month) {
        dupQuery += ' AND e.Month = ?';
        dupParams.push(dto.month);
      } else {
        dupQuery += ' AND (e.Month IS NULL OR e.Month = \'\')';
      }

      const dupRows: { sourceId: number }[] = await manager.query(dupQuery, dupParams);
      if (dupRows.length > 0) {
        throw new ConflictException(
          `This exam record already exists (Source ID: #${dupRows[0].sourceId})`,
        );
      }

      // 3. Atomically create Source
      const sourceResult = await manager.insert(Source, {
        sourceType: 'EXAM',
      });
      const sourceId = Number((sourceResult.identifiers[0] as Source).sourceId);

      // 4. Create Exam with the same SourceID
      await manager.insert(Exam, {
        sourceId,
        examType: dto.examType,
        examYear: dto.examYear,
        semesterNo: dto.semesterNo,
        subjectKey: dto.subjectKey,
        month: dto.month ?? null,
      });

      const label = this.buildLabel({
        sourceId,
        sourceType: 'EXAM',
        examType: dto.examType,
        examYear: dto.examYear,
        semesterNo: dto.semesterNo,
        subjectKey: dto.subjectKey,
        subjectName: subject.subjectName,
        subjectId: subject.subjectId,
        deptId: subject.deptId,
        deptName: null,
        month: dto.month ?? null,
        bookName: null,
        authorName: null,
        questionCount: 0,
      });

      return {
        sourceId,
        examType: dto.examType,
        examYear: dto.examYear,
        semesterNo: dto.semesterNo,
        subjectKey: dto.subjectKey,
        month: dto.month ?? null,
        subjectName: subject.subjectName,
        subjectId: subject.subjectId,
        deptId: subject.deptId,
        label,
        questionCount: 0,
      };
    });
  }

  /** List of all registered books */
  async findAllBooks(): Promise<BookItem[]> {
    try {
      const rows: SourceRow[] = await this.dataSource.query(
        `SELECT b.SourceID AS sourceId, b.BookName AS bookName, b.AuthorName AS authorName,
                (SELECT COUNT(*) FROM \`Question\` q WHERE q.SourceID = b.SourceID) AS questionCount
           FROM \`Book\` b
           JOIN \`Source\` s ON s.SourceID = b.SourceID
          ORDER BY b.BookName ASC, b.AuthorName ASC`,
      );

      return rows.map((r) => ({
        sourceId: Number(r.sourceId),
        bookName: r.bookName ?? '',
        authorName: r.authorName ?? '',
        label: `${r.bookName} — ${r.authorName}`,
        questionCount: Number(r.questionCount || 0),
      }));
    } catch (error: unknown) {
      this.logger.error(
        'Failed to load books',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Unable to load books');
    }
  }

  /**
   * Creates a Source record of type BOOK and its associated Book record atomically in a transaction.
   * Prevents duplicate book registration.
   */
  async createBook(dto: CreateBookDto): Promise<BookItem> {
    const trimmedBook = dto.bookName.trim();
    const trimmedAuthor = dto.authorName.trim();

    if (!trimmedBook || !trimmedAuthor) {
      throw new BadRequestException('Both book name and author name are required');
    }

    return await this.dataSource.transaction(async (manager) => {
      // Prevent duplicate book entries
      const dupRows: { sourceId: number }[] = await manager.query(
        `SELECT SourceID AS sourceId FROM \`Book\`
          WHERE LOWER(TRIM(BookName)) = LOWER(?)
            AND LOWER(TRIM(AuthorName)) = LOWER(?)
          LIMIT 1`,
        [trimmedBook, trimmedAuthor],
      );

      if (dupRows.length > 0) {
        throw new ConflictException(
          `This book is already registered (Source ID: #${dupRows[0].sourceId})`,
        );
      }

      // 1. Atomically create Source of type BOOK
      const sourceResult = await manager.insert(Source, {
        sourceType: 'BOOK',
      });
      const sourceId = Number((sourceResult.identifiers[0] as Source).sourceId);

      // 2. Create Book with matching SourceID
      await manager.insert(Book, {
        sourceId,
        bookName: trimmedBook,
        authorName: trimmedAuthor,
      });

      return {
        sourceId,
        bookName: trimmedBook,
        authorName: trimmedAuthor,
        label: `${trimmedBook} — ${trimmedAuthor}`,
        questionCount: 0,
      };
    });
  }

  private buildLabel(r: SourceRow): string {
    if (r.sourceType === 'BOOK') {
      const base = r.bookName ?? `Book #${r.sourceId}`;
      return r.authorName ? `${base} — ${r.authorName}` : base;
    }
    const parts = [
      [r.examType, r.examYear].filter(Boolean).join(' '),
      r.semesterNo != null ? `Sem ${r.semesterNo}` : null,
      r.subjectId ? `${r.subjectId}${r.subjectName ? ` - ${r.subjectName}` : ''}` : r.subjectName,
      r.month ? `(${r.month})` : null,
    ].filter(Boolean);
    return parts.length > 0
      ? `Exam: ${parts.join(' · ')}`
      : `Exam #${r.sourceId}`;
  }
}
