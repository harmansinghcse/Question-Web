import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Subject } from '../../subjects/entities/subject.entity';

@Entity({ name: 'Chapter' })
export class Chapter {
  @PrimaryGeneratedColumn({ name: 'chapterId', type: 'int' })
  chapterId: number;

  @Column({ name: 'chapterNo', type: 'int' })
  chapterNo: number;

  @Column({ name: 'chapterName', type: 'varchar', length: 150 })
  chapterName: string;

  @Column({ name: 'subjectKey', type: 'int', nullable: true })
  subjectKey: number | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectKey', referencedColumnName: 'subjectKey' })
  subject?: Subject | null;
}
