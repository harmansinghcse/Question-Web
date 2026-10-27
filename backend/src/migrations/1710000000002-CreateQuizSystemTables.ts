import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateQuizSystemTables1710000000002 implements MigrationInterface {
  name = 'CreateQuizSystemTables1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. QuizQuestion table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`QuizQuestion\` (
        \`quizQuesId\` int NOT NULL AUTO_INCREMENT,
        \`quesText\` text NOT NULL,
        \`options\` json NOT NULL,
        \`correctAnswer\` varchar(10) NOT NULL,
        \`explanation\` text NOT NULL,
        \`difficulty\` enum('EASY', 'MEDIUM', 'HARD') NOT NULL DEFAULT 'MEDIUM',
        \`chapterId\` int NOT NULL,
        \`contentHash\` varchar(64) DEFAULT NULL,
        \`modelName\` varchar(100) DEFAULT NULL,
        \`batchId\` varchar(100) DEFAULT NULL,
        \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`quizQuesId\`),
        KEY \`IDX_QuizQuestion_chapterId\` (\`chapterId\`),
        KEY \`IDX_QuizQuestion_difficulty\` (\`difficulty\`),
        KEY \`IDX_QuizQuestion_contentHash\` (\`contentHash\`),
        KEY \`IDX_QuizQuestion_batchId\` (\`batchId\`),
        CONSTRAINT \`FK_QuizQuestion_Chapter\` FOREIGN KEY (\`chapterId\`) REFERENCES \`Chapter\` (\`chapterId\`) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. QuizQuestionTopic junction table (supports multiple topics per question)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`QuizQuestionTopic\` (
        \`quizQuesId\` int NOT NULL,
        \`topicId\` int NOT NULL,
        PRIMARY KEY (\`quizQuesId\`, \`topicId\`),
        KEY \`IDX_QuizQuestionTopic_topicId\` (\`topicId\`),
        CONSTRAINT \`FK_QuizQuestionTopic_QuizQuestion\` FOREIGN KEY (\`quizQuesId\`) REFERENCES \`QuizQuestion\` (\`quizQuesId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_QuizQuestionTopic_Topic\` FOREIGN KEY (\`topicId\`) REFERENCES \`Topic\` (\`topicId\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. QuizAttempt table (persisting user attempts)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`QuizAttempt\` (
        \`attemptId\` int NOT NULL AUTO_INCREMENT,
        \`userId\` int DEFAULT NULL,
        \`subjectKey\` int NOT NULL,
        \`chapterId\` int DEFAULT NULL,
        \`difficulty\` varchar(20) NOT NULL DEFAULT 'ALL',
        \`totalQuestions\` int NOT NULL,
        \`correctAnswers\` int NOT NULL DEFAULT 0,
        \`incorrectAnswers\` int NOT NULL DEFAULT 0,
        \`unanswered\` int NOT NULL DEFAULT 0,
        \`accuracy\` decimal(5, 2) NOT NULL DEFAULT 0.00,
        \`timeTakenSeconds\` int NOT NULL DEFAULT 0,
        \`isCompleted\` tinyint(1) NOT NULL DEFAULT 0,
        \`startedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`completedAt\` timestamp NULL DEFAULT NULL,
        PRIMARY KEY (\`attemptId\`),
        KEY \`IDX_QuizAttempt_userId\` (\`userId\`),
        KEY \`IDX_QuizAttempt_subjectKey\` (\`subjectKey\`),
        KEY \`IDX_QuizAttempt_chapterId\` (\`chapterId\`),
        CONSTRAINT \`FK_QuizAttempt_User\` FOREIGN KEY (\`userId\`) REFERENCES \`User\` (\`userId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_QuizAttempt_Subject\` FOREIGN KEY (\`subjectKey\`) REFERENCES \`Subject\` (\`subjectKey\`) ON DELETE RESTRICT,
        CONSTRAINT \`FK_QuizAttempt_Chapter\` FOREIGN KEY (\`chapterId\`) REFERENCES \`Chapter\` (\`chapterId\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. QuizAttemptResponse table (per-question answers and correctness)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`QuizAttemptResponse\` (
        \`responseId\` int NOT NULL AUTO_INCREMENT,
        \`attemptId\` int NOT NULL,
        \`quizQuesId\` int NOT NULL,
        \`selectedAnswer\` varchar(10) DEFAULT NULL,
        \`isCorrect\` tinyint(1) NOT NULL DEFAULT 0,
        PRIMARY KEY (\`responseId\`),
        UNIQUE KEY \`UQ_QuizAttemptResponse_attempt_question\` (\`attemptId\`, \`quizQuesId\`),
        KEY \`IDX_QuizAttemptResponse_quizQuesId\` (\`quizQuesId\`),
        CONSTRAINT \`FK_QuizAttemptResponse_Attempt\` FOREIGN KEY (\`attemptId\`) REFERENCES \`QuizAttempt\` (\`attemptId\`) ON DELETE CASCADE,
        CONSTRAINT \`FK_QuizAttemptResponse_QuizQuestion\` FOREIGN KEY (\`quizQuesId\`) REFERENCES \`QuizQuestion\` (\`quizQuesId\`) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS \`QuizAttemptResponse\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`QuizAttempt\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`QuizQuestionTopic\`;`);
    await queryRunner.query(`DROP TABLE IF EXISTS \`QuizQuestion\`;`);
  }
}
