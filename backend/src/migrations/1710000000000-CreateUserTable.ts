import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserTable1710000000000 implements MigrationInterface {
  name = 'CreateUserTable1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`User\` (
        \`userId\` int NOT NULL AUTO_INCREMENT,
        \`email\` varchar(255) NOT NULL,
        \`passwordHash\` varchar(255) NOT NULL,
        \`displayName\` varchar(100) NOT NULL,
        \`role\` enum('STUDENT', 'ADMIN') NOT NULL DEFAULT 'STUDENT',
        \`accountStatus\` enum('ACTIVE', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`userId\`),
        UNIQUE KEY \`UQ_User_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`User\`;`);
  }
}
