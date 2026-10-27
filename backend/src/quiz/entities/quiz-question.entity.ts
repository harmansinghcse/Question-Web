import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { QuizQuestionTopic } from './quiz-question-topic.entity';

export enum QuizQuestionType {
  MCQ = 'MCQ',
  FILLUPS = 'FILLUPS',
  TRUE_FALSE = 'TRUE_FALSE',
}

export enum QuizDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export type QuizOptions = Record<string, string>;

@Entity({ name: 'QuizQuestion' })
export class QuizQuestion {
  @PrimaryGeneratedColumn({ name: 'quizQuesId', type: 'int' })
  quizQuesId: number;

  @Column({ name: 'quesText', type: 'text' })
  quesText: string;

  @Column({
    name: 'questionType',
    type: 'enum',
    enum: QuizQuestionType,
    default: QuizQuestionType.MCQ,
  })
  questionType: QuizQuestionType;

  /**
   * For MCQ: stored as JSON { "A": "...", "B": "..." }. Nullable for FILLUPS / TRUE_FALSE.
   */
  @Column({ name: 'options', type: 'json', nullable: true })
  options?: QuizOptions | null;

  /**
   * Canonical answer string:
   * - MCQ: e.g. "A" or "B"
   * - FILLUPS: primary accepted answer string, e.g. "Binary Search Tree"
   * - TRUE_FALSE: "TRUE" or "FALSE"
   */
  @Column({ name: 'correctAnswer', type: 'varchar', length: 255 })
  correctAnswer: string;

  /**
   * For FILLUPS: array of alternate accepted answer strings for normalization comparison
   */
  @Column({ name: 'acceptedAnswers', type: 'json', nullable: true })
  acceptedAnswers?: string[] | null;

  @Column({ name: 'explanation', type: 'text' })
  explanation: string;

  @Column({
    name: 'difficulty',
    type: 'enum',
    enum: QuizDifficulty,
    default: QuizDifficulty.MEDIUM,
  })
  difficulty: QuizDifficulty;

  @Column({ name: 'chapterId', type: 'int' })
  chapterId: number;

  @ManyToOne(() => Chapter, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'chapterId', referencedColumnName: 'chapterId' })
  chapter?: Chapter;

  @Column({ name: 'contentHash', type: 'varchar', length: 64, nullable: true })
  contentHash?: string | null;

  @Column({ name: 'modelName', type: 'varchar', length: 100, nullable: true })
  modelName?: string | null;

  @Column({ name: 'batchId', type: 'varchar', length: 100, nullable: true })
  batchId?: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => QuizQuestionTopic, (qqt) => qqt.question)
  topics?: QuizQuestionTopic[];
}
