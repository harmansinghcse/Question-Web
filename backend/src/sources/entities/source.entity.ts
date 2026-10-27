import { Column, Entity, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Exam } from './exam.entity';
import { Book } from './book.entity';

export const SOURCE_TYPES = ['EXAM', 'BOOK'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

@Entity({ name: 'Source' })
export class Source {
  @PrimaryGeneratedColumn({ name: 'SourceID', type: 'int' })
  sourceId: number;

  @Column({ name: 'SourceType', type: 'enum', enum: SOURCE_TYPES })
  sourceType: SourceType;

  @OneToOne(() => Exam, (exam) => exam.source)
  exam?: Exam;

  @OneToOne(() => Book, (book) => book.source)
  book?: Book;
}
