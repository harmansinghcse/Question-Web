import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { Subject } from '../../subjects/entities/subject.entity';

@Entity({ name: 'UpcomingExam' })
export class UpcomingExam {
  @PrimaryGeneratedColumn({ name: 'examId', type: 'int' })
  examId: number;

  @Index('IDX_UpcomingExam_deptId')
  @Column({ name: 'deptId', type: 'int' })
  deptId: number;

  @ManyToOne(() => Department, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deptId', referencedColumnName: 'deptId' })
  department?: Department;

  @Index('IDX_UpcomingExam_subjectKey')
  @Column({ name: 'subjectKey', type: 'int', nullable: true })
  subjectKey?: number | null;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'subjectKey', referencedColumnName: 'subjectKey' })
  subject?: Subject | null;

  @Column({ name: 'semester', type: 'int', nullable: true })
  semester?: number | null;

  @Column({ name: 'title', type: 'varchar', length: 150 })
  title: string;

  @Index('IDX_UpcomingExam_examDate')
  @Column({ name: 'examDate', type: 'datetime' })
  examDate: Date;

  @Column({ name: 'durationMinutes', type: 'int', default: 120 })
  durationMinutes: number;

  @Column({ name: 'venue', type: 'varchar', length: 100, nullable: true })
  venue?: string | null;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions?: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
