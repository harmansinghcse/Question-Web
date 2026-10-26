import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { User, UserRole, AccountStatus } from '../../users/entities/user.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const mockFindById = jest.fn();

  beforeEach(async () => {
    mockFindById.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test_jwt_secret'),
          },
        },
        {
          provide: UsersService,
          useValue: {
            findById: mockFindById,
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload: JwtPayload = {
      sub: 1,
      email: 'user@example.com',
      role: UserRole.STUDENT,
    };

    it('should validate and return safe user when account is active', async () => {
      const mockUser: User = {
        userId: 1,
        email: 'user@example.com',
        passwordHash: 'secret_hash',
        displayName: 'Active User',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindById.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(result).toBeDefined();
      expect(result.userId).toBe(1);
      expect((result as any).passwordHash).toBeUndefined();
      expect(result.displayName).toBe('Active User');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockFindById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException when user account is disabled', async () => {
      const mockUser: User = {
        userId: 1,
        email: 'user@example.com',
        passwordHash: 'secret_hash',
        displayName: 'Disabled User',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.DISABLED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockFindById.mockResolvedValue(mockUser);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
