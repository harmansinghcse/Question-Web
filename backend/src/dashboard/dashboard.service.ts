import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface DashboardStats {
  totalQuestions: number;
  totalSubjects: number;
  totalTopics: number;
}

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly dataSource: DataSource) {}

  async getStats(): Promise<DashboardStats> {
    try {
      // Table names verified against the live schema: Question, Subject, Topic.
      const rows: Array<Record<string, string | number>> =
        await this.dataSource.query(
          `SELECT
             (SELECT COUNT(*) FROM \`Question\`) AS totalQuestions,
             (SELECT COUNT(*) FROM \`Subject\`)  AS totalSubjects,
             (SELECT COUNT(*) FROM \`Topic\`)    AS totalTopics`,
        );

      const row = rows[0];

      return {
        totalQuestions: Number(row.totalQuestions),
        totalSubjects: Number(row.totalSubjects),
        totalTopics: Number(row.totalTopics),
      };
    } catch (error: unknown) {
      this.logger.error(
        'Failed to load dashboard statistics',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException(
        'Unable to load dashboard statistics',
      );
    }
  }
}
