import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, AccountStatus } from './entities/user.entity';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
  role?: UserRole;
  accountStatus?: AccountStatus;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository.findOne({
      where: { email: normalizedEmail },
    });
  }

  async findById(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { userId },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const user = this.userRepository.create({
      email: data.email.trim().toLowerCase(),
      passwordHash: data.passwordHash,
      displayName: data.displayName.trim(),
      role: data.role ?? UserRole.STUDENT,
      accountStatus: data.accountStatus ?? AccountStatus.ACTIVE,
    });

    return this.userRepository.save(user);
  }
}
