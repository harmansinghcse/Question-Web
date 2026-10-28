import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Department } from '../../departments/entities/department.entity';
import { TimetableEntry } from './timetable-entry.entity';

@Entity({ name: 'Timetable' })
@Index('IDX_Timetable_scope', [
  'deptId',
  'semester',
  'division',
  'academicYear',
])
export class Timetable {
  @PrimaryGeneratedColumn({ name: 'timetableId', type: 'int' })
  timetableId: number;

  @Index('IDX_Timetable_deptId')
  @Column({ name: 'deptId', type: 'int' })
  deptId: number;

  @ManyToOne(() => Department, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deptId', referencedColumnName: 'deptId' })
  department?: Department;

  @Column({ name: 'semester', type: 'int' })
  semester: number;

  @Column({ name: 'division', type: 'varchar', length: 10, default: 'A' })
  division: string;

  @Column({ name: 'academicYear', type: 'varchar', length: 20 })
  academicYear: string;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => TimetableEntry, (entry) => entry.timetable, {
    cascade: true,
  })
  entries?: TimetableEntry[];

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
