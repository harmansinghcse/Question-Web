import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * One recorded lecture / coverage session. This table is the historical
 * source of truth: "covered as of D" is derived from events with
 * coverageDate <= D. coverageDate is a calendar DATE ('YYYY-MM-DD'),
 * createdAt is the time the record was entered.
 */
@Entity({ name: 'CoverageEvent' })
@Index('IDX_CoverageEvent_user_subject_date', [
  'userId',
  'subjectKey',
  'coverageDate',
])
export class CoverageEvent {
  @PrimaryGeneratedColumn({ name: 'eventId', type: 'int' })
  eventId: number;

  @Column({ name: 'userId', type: 'int' })
  userId: number;

  @Column({ name: 'subjectKey', type: 'int' })
  subjectKey: number;

  @Column({ name: 'coverageDate', type: 'date' })
  coverageDate: string;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}

