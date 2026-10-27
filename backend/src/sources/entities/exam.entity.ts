import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryColumn,
} from 'typeorm';
import { Source } from './source.entity';
import { Subject } from '../../subjects/entities/subject.entity';

export const EXAM_TYPES = [
  'QUIZ',
  'TUTORIAL',
  'ASSIGNMENT',
  'MIDSEM',
  'ENDSEM',
] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const EXAM_MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
] as const;
export type ExamMonth = (typeof EXAM_MONTHS)[number];

@Entity({ name: 'Exam' })
export class Exam {
  @PrimaryColumn({ name: 'SourceID', type: 'int' })
  sourceId: number;

  @Column({ name: 'ExamType', type: 'enum', enum: EXAM_TYPES })
  examType: ExamType;

  @Column({ name: 'ExamYear', type: 'year' })
  examYear: number;

  @Column({ name: 'SemesterNo', type: 'int' })
  semesterNo: number;

  @Column({ name: 'subjectKey', type: 'int', nullable: true })
  subjectKey: number | null;

  @Column({ name: 'Month', type: 'enum', enum: EXAM_MONTHS, nullable: true })
  month?: ExamMonth | null;

  @OneToOne(() => Source, (source) => source.exam, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'SourceID', referencedColumnName: 'sourceId' })
  source?: Source;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectKey', referencedColumnName: 'subjectKey' })
  subject?: Subject | null;
}
