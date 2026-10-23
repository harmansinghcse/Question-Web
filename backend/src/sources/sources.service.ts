import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface SourceSummary {
  sourceId: number;
  sourceType: 'EXAM' | 'BOOK';
  label: string;
}

interface SourceRow {
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
export class SourcesService {
  private readonly logger = new Logger(SourcesService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Read-only list of EXISTING sources (Source + Exam/Book details). */
  async findAll(): Promise<SourceSummary[]> {
    try {
      const rows: SourceRow[] = await this.dataSource.query(
        `SELECT s.SourceID AS sourceId, s.SourceType AS sourceType,
                e.ExamType AS examType, e.ExamYear AS examYear,
                e.SemesterNo AS semesterNo, sub.subjectName AS subjectName,
                b.BookName AS bookName, b.AuthorName AS authorName
           FROM \`Source\` s
           LEFT JOIN \`Exam\` e ON e.SourceID = s.SourceID
           LEFT JOIN \`Subject\` sub ON sub.subjectKey = e.subjectKey
           LEFT JOIN \`Book\` b ON b.SourceID = s.SourceID
          ORDER BY s.SourceID`,
      );

      return rows.map((r) => ({
        sourceId: Number(r.sourceId),
        sourceType: r.sourceType,
        label: this.buildLabel(r),
      }));
    } catch (error: unknown) {
      this.logger.error(
        'Failed to load sources',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('Unable to load sources');
    }
  }

  private buildLabel(r: SourceRow): string {
    if (r.sourceType === 'BOOK') {
      const base = r.bookName ?? `Book #${r.sourceId}`;
      return r.authorName ? `${base} — ${r.authorName}` : base;
    }
    const parts = [
      [r.examType, r.examYear].filter(Boolean).join(' '),
      r.semesterNo != null ? `Semester ${r.semesterNo}` : null,
      r.subjectName,
    ].filter(Boolean);
    return parts.length > 0
      ? `Exam: ${parts.join(' · ')}`
      : `Exam #${r.sourceId}`;
  }
}
