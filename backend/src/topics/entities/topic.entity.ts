import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Chapter } from '../../chapters/entities/chapter.entity';

@Entity({ name: 'Topic' })
export class Topic {
  @PrimaryGeneratedColumn({ name: 'topicId', type: 'int' })
  topicId: number;

  @Column({ name: 'topicName', type: 'varchar', length: 120 })
  topicName: string;

  @Column({ name: 'chapterId', type: 'int' })
  chapterId: number;

  @ManyToOne(() => Chapter, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'chapterId', referencedColumnName: 'chapterId' })
  chapter?: Chapter;
}
