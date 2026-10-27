import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { Source } from './source.entity';

@Entity({ name: 'Book' })
export class Book {
  @PrimaryColumn({ name: 'SourceID', type: 'int' })
  sourceId: number;

  @Column({ name: 'BookName', type: 'varchar', length: 200 })
  bookName: string;

  @Column({ name: 'AuthorName', type: 'varchar', length: 200 })
  authorName: string;

  @OneToOne(() => Source, (source) => source.book, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'SourceID', referencedColumnName: 'sourceId' })
  source?: Source;
}
