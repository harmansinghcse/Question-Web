import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimetableTables1710000000005 implements MigrationInterface {
  name = 'CreateTimetableTables1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`Timetable\` (
        \`timetableId\` int NOT NULL AUTO_INCREMENT,
        \`deptId\` int NOT NULL,
        \`semester\` int NOT NULL,
        \`division\` varchar(10) NOT NULL DEFAULT 'A',
        \`academicYear\` varchar(20) NOT NULL,
        \`isActive\` tinyint(1) NOT NULL DEFAULT 1,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`timetableId\`),
        KEY \`IDX_Timetable_deptId\` (\`deptId\`),
        KEY \`IDX_Timetable_scope\` (\`deptId\`, \`semester\`, \`division\`, \`academicYear\`),
        CONSTRAINT \`FK_Timetable_Department\` FOREIGN KEY (\`deptId\`) REFERENCES \`Department\` (\`deptId\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`TimetableEntry\` (
        \`entryId\` int NOT NULL AUTO_INCREMENT,
        \`timetableId\` int NOT NULL,
        \`subjectKey\` int NOT NULL,
        \`dayOfWeek\` enum('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN') NOT NULL,
        \`startTime\` varchar(5) NOT NULL,
        \`endTime\` varchar(5) NOT NULL,
        \`classroom\` varchar(50) DEFAULT NULL,
        \`teacher\` varchar(100) DEFAULT NULL,
        \`classType\` enum('LECTURE', 'LAB', 'TUTORIAL', 'OTHER') NOT NULL DEFAULT 'LECTURE',
        PRIMARY KEY (\`entryId\`),
        KEY \`IDX_TimetableEntry_timetableId\` (\`timetableId\`),
        KEY \`IDX_TimetableEntry_subjectKey\` (\`subjectKey\`),
        CONSTRAINT \`FK_TimetableEntry_Timetable\` FOREIGN KEY (\`timetableId\`) REFERENCES \`Timetable\` (\`timetableId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_TimetableEntry_Subject\` FOREIGN KEY (\`subjectKey\`) REFERENCES \`Subject\` (\`subjectKey\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`TimetableEntry\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`Timetable\`;`);
  }
}
