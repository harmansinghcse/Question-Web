import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

// Maps the existing `Department` table (deptId, deptName). Read-only usage.
@Entity({ name: 'Department' })
export class Department {
  @PrimaryGeneratedColumn({ name: 'deptId', type: 'int' })
  deptId: number;

  @Column({ name: 'deptName', type: 'varchar', length: 100 })
  deptName: string;
}
