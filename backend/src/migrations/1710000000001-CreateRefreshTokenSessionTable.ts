import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokenSessionTable1710000000001 implements MigrationInterface {
  name = 'CreateRefreshTokenSessionTable1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`RefreshTokenSession\` (
        \`sessionId\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int NOT NULL,
        \`tokenHash\` varchar(255) NOT NULL,
        \`expiresAt\` timestamp NOT NULL,
        \`isRevoked\` tinyint(1) NOT NULL DEFAULT 0,
        \`replacedByTokenHash\` varchar(255) DEFAULT NULL,
        \`userAgent\` varchar(255) DEFAULT NULL,
        \`ipAddress\` varchar(45) DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`sessionId\`),
        KEY \`IDX_RefreshTokenSession_tokenHash\` (\`tokenHash\`),
        KEY \`FK_RefreshTokenSession_userId\` (\`userId\`),
        CONSTRAINT \`FK_RefreshTokenSession_User\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`userId\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`RefreshTokenSession\`;`);
  }
}
