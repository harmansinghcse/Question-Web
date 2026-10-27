import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddQuizQuestionTypes1710000000003 implements MigrationInterface {
  name = 'AddQuizQuestionTypes1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add questionType column with default 'MCQ'
    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      ADD COLUMN \`questionType\` ENUM('MCQ', 'FILLUPS', 'TRUE_FALSE') NOT NULL DEFAULT 'MCQ' AFTER \`quesText\`;
    `);

    // 2. Add index on questionType for fast filtering
    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      ADD INDEX \`IDX_QuizQuestion_questionType\` (\`questionType\`);
    `);

    // 3. Make options JSON nullable (so FILLUPS and TRUE_FALSE don't require dummy option structures)
    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      MODIFY COLUMN \`options\` JSON NULL;
    `);

    // 4. Expand correctAnswer length to 255 to accommodate fill-in-the-blank answer strings
    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      MODIFY COLUMN \`correctAnswer\` VARCHAR(255) NOT NULL;
    `);

    // 5. Add acceptedAnswers JSON column for FILLUPS (stores array of alternate accepted answer strings)
    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      ADD COLUMN \`acceptedAnswers\` JSON NULL AFTER \`correctAnswer\`;
    `);

    // 6. Expand QuizAttemptResponse.selectedAnswer to VARCHAR(500) for student typed answers
    await queryRunner.query(`
      ALTER TABLE \`QuizAttemptResponse\`
      MODIFY COLUMN \`selectedAnswer\` VARCHAR(500) NULL;
    `);

    // 7. Ensure all existing questions have questionType set to 'MCQ'
    await queryRunner.query(`
      UPDATE \`QuizQuestion\`
      SET \`questionType\` = 'MCQ'
      WHERE \`questionType\` IS NULL OR \`questionType\` = '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      DROP INDEX \`IDX_QuizQuestion_questionType\`;
    `);

    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      DROP COLUMN \`acceptedAnswers\`;
    `);

    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      DROP COLUMN \`questionType\`;
    `);

    await queryRunner.query(`
      ALTER TABLE \`QuizQuestion\`
      MODIFY COLUMN \`correctAnswer\` VARCHAR(10) NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE \`QuizAttemptResponse\`
      MODIFY COLUMN \`selectedAnswer\` VARCHAR(10) NULL;
    `);
  }
}
