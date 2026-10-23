import { Entity, PrimaryColumn } from 'typeorm';

// Maps the existing `QuestionTopic` join table (composite primary key).
@Entity({ name: 'QuestionTopic' })
export class QuestionTopic {
  @PrimaryColumn({ name: 'QuesID', type: 'int' })
  quesId: number;

  @PrimaryColumn({ name: 'TopicID', type: 'int' })
  topicId: number;
}
