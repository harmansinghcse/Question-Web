import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'Subject' })
export class Subject {
  @PrimaryGeneratedColumn({ name: 'subjectKey', type: 'int' })
  subjectKey: number;

  @Column({ name: 'subjectId', type: 'char', length: 5 })
  subjectId: string;

  @Column({ name: 'deptId', type: 'int' })
  deptId: number;

  @Column({
    name: 'subjectName',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  subjectName: string | null;

  @Column({ name: 'credits', type: 'int' })
  credits: number;

  @Column({ name: 'semester', type: 'int', default: 1 })
  semester: number;
}
