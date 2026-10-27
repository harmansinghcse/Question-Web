import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Chapter } from '../../chapters/entities/chapter.entity';
import { QuizAttemptResponse } from './quiz-attempt-response.entity';

@Entity({ name: 'QuizAttempt' })
export class QuizAttempt {
  @PrimaryGeneratedColumn({ name: 'attemptId', type: 'int' })
  attemptId: number;

  @Column({ name: 'userId', type: 'int', nullable: true })
  userId?: number | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user?: User | null;

  @Column({ name: 'subjectKey', type: 'int' })
  subjectKey: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectKey', referencedColumnName: 'subjectKey' })
  subject?: Subject;

  @Column({ name: 'chapterId', type: 'int', nullable: true })
  chapterId?: number | null;

  @ManyToOne(() => Chapter, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'chapterId', referencedColumnName: 'chapterId' })
  chapter?: Chapter | null;

  @Column({ name: 'difficulty', type: 'varchar', length: 20, default: 'ALL' })
  difficulty: string;

  @Column({ name: 'totalQuestions', type: 'int' })
  totalQuestions: number;

  @Column({ name: 'correctAnswers', type: 'int', default: 0 })
  correctAnswers: number;

  @Column({ name: 'incorrectAnswers', type: 'int', default: 0 })
  incorrectAnswers: number;

  @Column({ name: 'unanswered', type: 'int', default: 0 })
  unanswered: number;

  @Column({
    name: 'accuracy',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0.0,
  })
  accuracy: number;

  @Column({ name: 'timeTakenSeconds', type: 'int', default: 0 })
  timeTakenSeconds: number;

  @Column({ name: 'isCompleted', type: 'tinyint', default: 0 })
  isCompleted: boolean;

  @CreateDateColumn({ name: 'startedAt', type: 'timestamp' })
  startedAt: Date;

  @Column({ name: 'completedAt', type: 'timestamp', nullable: true })
  completedAt?: Date | null;

  @OneToMany(() => QuizAttemptResponse, (resp) => resp.attempt)
  responses?: QuizAttemptResponse[];
}
