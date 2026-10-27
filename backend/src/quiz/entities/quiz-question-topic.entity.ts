import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { QuizQuestion } from './quiz-question.entity';
import { Topic } from '../../topics/entities/topic.entity';

@Entity({ name: 'QuizQuestionTopic' })
export class QuizQuestionTopic {
  @PrimaryColumn({ name: 'quizQuesId', type: 'int' })
  quizQuesId: number;

  @PrimaryColumn({ name: 'topicId', type: 'int' })
  topicId: number;

  @ManyToOne(() => QuizQuestion, (q) => q.topics, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'quizQuesId', referencedColumnName: 'quizQuesId' })
  question?: QuizQuestion;

  @ManyToOne(() => Topic, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'topicId', referencedColumnName: 'topicId' })
  topic?: Topic;
}
