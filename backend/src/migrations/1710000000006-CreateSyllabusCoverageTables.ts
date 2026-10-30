import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyllabusCoverageTables1710000000006
  implements MigrationInterface
{
  name = 'CreateSyllabusCoverageTables1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // One row per recorded lecture / coverage session.
    // coverageDate is the day the material was taught (DATE, no timezone);
    // createdAt is when the student entered the record.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`CoverageEvent\` (
        \`eventId\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`subjectKey\` int NOT NULL,
        \`coverageDate\` date NOT NULL,
        \`notes\` varchar(500) DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`eventId\`),
        KEY \`IDX_CoverageEvent_user_subject_date\` (\`userId\`, \`subjectKey\`, \`coverageDate\`),
        KEY \`IDX_CoverageEvent_subjectKey\` (\`subjectKey\`),
        CONSTRAINT \`FK_CoverageEvent_User\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`userId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_CoverageEvent_Subject\` FOREIGN KEY (\`subjectKey\`) REFERENCES \`Subject\` (\`subjectKey\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Topics taught in an event. A topic may appear in many events (revisited
    // on different dates) but only once per event.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`CoverageEventTopic\` (
        \`eventId\` int NOT NULL,
        \`topicId\` int NOT NULL,
        PRIMARY KEY (\`eventId\`, \`topicId\`),
        KEY \`IDX_CoverageEventTopic_topicId\` (\`topicId\`),
        CONSTRAINT \`FK_CoverageEventTopic_Event\` FOREIGN KEY (\`eventId\`) REFERENCES \`CoverageEvent\` (\`eventId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_CoverageEventTopic_Topic\` FOREIGN KEY (\`topicId\`) REFERENCES \`Topic\` (\`topicId\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`CoverageEventTopic\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`CoverageEvent\`;`);
  }
}

