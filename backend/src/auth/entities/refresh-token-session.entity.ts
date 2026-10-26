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
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'RefreshTokenSession' })
export class RefreshTokenSession {
  @PrimaryGeneratedColumn({ name: 'sessionId', type: 'int' })
  sessionId: number;

  @Column({ name: 'userId', type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'userId' })
  user: User;

  @Index('IDX_RefreshTokenSession_tokenHash')
  @Column({ name: 'tokenHash', type: 'varchar', length: 255 })
  tokenHash: string;

  @Column({ name: 'expiresAt', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'isRevoked', type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ name: 'replacedByTokenHash', type: 'varchar', length: 255, nullable: true })
  replacedByTokenHash: string | null;

  @Column({ name: 'userAgent', type: 'varchar', length: 255, nullable: true })
  userAgent: string | null;

  @Column({ name: 'ipAddress', type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp' })
  updatedAt: Date;
}
