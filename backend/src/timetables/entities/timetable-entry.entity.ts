import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Timetable } from './timetable.entity';
import { Subject } from '../../subjects/entities/subject.entity';

export enum DayOfWeek {
  MON = 'MON',
  TUE = 'TUE',
  WED = 'WED',
  THU = 'THU',
  FRI = 'FRI',
  SAT = 'SAT',
  SUN = 'SUN',
}

export enum ClassType {
  LECTURE = 'LECTURE',
  LAB = 'LAB',
  TUTORIAL = 'TUTORIAL',
  OTHER = 'OTHER',
}

@Entity({ name: 'TimetableEntry' })
export class TimetableEntry {
  @PrimaryGeneratedColumn({ name: 'entryId', type: 'int' })
  entryId: number;

  @Index('IDX_TimetableEntry_timetableId')
  @Column({ name: 'timetableId', type: 'int' })
  timetableId: number;

  @ManyToOne(() => Timetable, (tt) => tt.entries, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'timetableId', referencedColumnName: 'timetableId' })
  timetable?: Timetable;

  @Index('IDX_TimetableEntry_subjectKey')
  @Column({ name: 'subjectKey', type: 'int' })
  subjectKey: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectKey', referencedColumnName: 'subjectKey' })
  subject?: Subject;

  @Column({ name: 'dayOfWeek', type: 'enum', enum: DayOfWeek })
  dayOfWeek: DayOfWeek;

  @Column({ name: 'startTime', type: 'varchar', length: 5 })
  startTime: string; // HH:mm format, e.g., '09:00'

  @Column({ name: 'endTime', type: 'varchar', length: 5 })
  endTime: string; // HH:mm format, e.g., '10:00'

  @Column({ name: 'classroom', type: 'varchar', length: 50, nullable: true })
  classroom?: string | null;

  @Column({ name: 'teacher', type: 'varchar', length: 100, nullable: true })
  teacher?: string | null;

  @Column({
    name: 'classType',
    type: 'enum',
    enum: ClassType,
    default: ClassType.LECTURE,
  })
  classType: ClassType;
}
