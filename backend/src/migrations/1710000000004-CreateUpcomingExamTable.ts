import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUpcomingExamTable1710000000004 implements MigrationInterface {
  name = 'CreateUpcomingExamTable1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`UpcomingExam\` (
        \`examId\` int NOT NULL AUTO_INCREMENT,
        \`deptId\` int NOT NULL,
        \`subjectKey\` int DEFAULT NULL,
        \`semester\` int DEFAULT NULL,
        \`title\` varchar(150) NOT NULL,
        \`examDate\` datetime NOT NULL,
        \`durationMinutes\` int NOT NULL DEFAULT 120,
        \`venue\` varchar(100) DEFAULT NULL,
        \`instructions\` text DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`examId\`),
        KEY \`IDX_UpcomingExam_deptId\` (\`deptId\`),
        KEY \`IDX_UpcomingExam_subjectKey\` (\`subjectKey\`),
        KEY \`IDX_UpcomingExam_examDate\` (\`examDate\`),
        CONSTRAINT \`FK_UpcomingExam_Department\` FOREIGN KEY (\`deptId\`) REFERENCES \`Department\` (\`deptId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_UpcomingExam_Subject\` FOREIGN KEY (\`subjectKey\`) REFERENCES \`Subject\` (\`subjectKey\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`UpcomingExam\`;`);
  }
}
