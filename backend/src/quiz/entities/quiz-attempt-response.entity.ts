import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { QuizAttempt } from './quiz-attempt.entity';
import { QuizQuestion } from './quiz-question.entity';

@Entity({ name: 'QuizAttemptResponse' })
export class QuizAttemptResponse {
  @PrimaryGeneratedColumn({ name: 'responseId', type: 'int' })
  responseId: number;

  @Column({ name: 'attemptId', type: 'int' })
  attemptId: number;

  @ManyToOne(() => QuizAttempt, (a) => a.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attemptId', referencedColumnName: 'attemptId' })
  attempt?: QuizAttempt;

  @Column({ name: 'quizQuesId', type: 'int' })
  quizQuesId: number;

  @ManyToOne(() => QuizQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizQuesId', referencedColumnName: 'quizQuesId' })
  question?: QuizQuestion;

  @Column({ name: 'selectedAnswer', type: 'varchar', length: 500, nullable: true })
  selectedAnswer?: string | null;

  @Column({ name: 'isCorrect', type: 'tinyint', default: 0 })
  isCorrect: boolean;
}
