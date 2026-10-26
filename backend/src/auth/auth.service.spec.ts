import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { User, UserRole, AccountStatus } from '../users/entities/user.entity';
import { RefreshTokenSession } from './entities/refresh-token-session.entity';

describe('AuthService', () => {
  let authService: AuthService;
  const mockFindByEmail = jest.fn();
  const mockFindById = jest.fn();
  const mockCreateUser = jest.fn();
  const mockHashPassword = jest.fn();
  const mockComparePassword = jest.fn();
  const mockSignAsync = jest.fn();

  const mockSessionFindOne = jest.fn();
  const mockSessionCreate = jest.fn();
  const mockSessionSave = jest.fn();
  const mockSessionUpdate = jest.fn();

  const createSampleUser = (overrides?: Partial<User>): User => ({
    userId: 1,
    email: 'student@example.com',
    passwordHash: '$2a$12$hashed_student_pass',
    displayName: 'Student One',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(async () => {
    mockFindByEmail.mockReset();
    mockFindById.mockReset();
    mockCreateUser.mockReset();
    mockHashPassword.mockReset();
    mockComparePassword.mockReset();
    mockSignAsync.mockReset();

    mockSessionFindOne.mockReset();
    mockSessionCreate.mockReset();
    mockSessionSave.mockReset();
    mockSessionUpdate.mockReset();

    mockSignAsync.mockResolvedValue('mock_jwt_access_token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: mockFindByEmail,
            findById: mockFindById,
            create: mockCreateUser,
          },
        },
        {
          provide: PasswordService,
          useValue: {
            hashPassword: mockHashPassword,
            comparePassword: mockComparePassword,
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: mockSignAsync,
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) => {
              if (key === 'JWT_ACCESS_SECRET') return 'test_access_secret';
              if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
              return def;
            }),
          },
        },
        {
          provide: getRepositoryToken(RefreshTokenSession),
          useValue: {
            findOne: mockSessionFindOne,
            create: mockSessionCreate,
            save: mockSessionSave,
            update: mockSessionUpdate,
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('Registration', () => {
    it('should register a student successfully with hashed password and STUDENT role', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed_pwd_val');
      mockCreateUser.mockResolvedValue(
        createSampleUser({ passwordHash: 'hashed_pwd_val' }),
      );

      const result = await authService.register({
        email: 'student@example.com',
        password: 'Password123!',
        displayName: 'Student One',
      });

      expect(mockFindByEmail).toHaveBeenCalledWith('student@example.com');
      expect(mockHashPassword).toHaveBeenCalledWith('Password123!');
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'student@example.com',
        passwordHash: 'hashed_pwd_val',
        displayName: 'Student One',
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      });
      expect(result.role).toBe(UserRole.STUDENT);
      expect((result as any).passwordHash).toBeUndefined();
    });

    it('should throw ConflictException on duplicate email', async () => {
      mockFindByEmail.mockResolvedValue(createSampleUser());

      await expect(
        authService.register({
          email: 'student@example.com',
          password: 'Password123!',
          displayName: 'Duplicate Student',
        }),
      ).rejects.toThrow(ConflictException);

      expect(mockCreateUser).not.toHaveBeenCalled();
    });

    it('should handle concurrent registration uniqueness conflict via database error', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed_pwd_val');
      mockCreateUser.mockRejectedValue({ code: 'ER_DUP_ENTRY', errno: 1062 });

      await expect(
        authService.register({
          email: 'student@example.com',
          password: 'Password123!',
          displayName: 'Concurrent Student',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should strictly reject attempts to assign ADMIN role on public registration', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockHashPassword.mockResolvedValue('hashed_pwd_val');
      mockCreateUser.mockResolvedValue(createSampleUser());

      const maliciousPayload: any = {
        email: 'student@example.com',
        password: 'Password123!',
        displayName: 'Malicious Student',
        role: 'ADMIN',
      };

      const result = await authService.register(maliciousPayload);

      // Verify that create was called with STUDENT and never ADMIN
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.STUDENT,
        }),
      );
      expect(result.role).toBe(UserRole.STUDENT);
    });
  });

  describe('Login', () => {
    it('should log in successfully and create a hashed refresh token session', async () => {
      mockFindByEmail.mockResolvedValue(createSampleUser());
      mockComparePassword.mockResolvedValue(true);
      mockSessionCreate.mockImplementation((s) => s);
      mockSessionSave.mockResolvedValue({ sessionId: 1 });

      const result = await authService.login(
        { email: 'student@example.com', password: 'Password123!' },
        { userAgent: 'JestTestAgent', ipAddress: '127.0.0.1' },
      );

      expect(result.accessToken).toBe('mock_jwt_access_token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('student@example.com');
      expect((result.user as any).passwordHash).toBeUndefined();

      expect(mockSessionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          isRevoked: false,
          userAgent: 'JestTestAgent',
          ipAddress: '127.0.0.1',
        }),
      );

      // Stored tokenHash must be SHA-256 hash, NOT raw refresh token
      const sessionArg = mockSessionCreate.mock.calls[0][0];
      expect(sessionArg.tokenHash).not.toEqual(result.refreshToken);
      expect(sessionArg.tokenHash).toEqual(authService.hashToken(result.refreshToken));
    });

    it('should reject incorrect password with generic UnauthorizedException', async () => {
      mockFindByEmail.mockResolvedValue(createSampleUser());
      mockComparePassword.mockResolvedValue(false);

      await expect(
        authService.login({
          email: 'student@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));

      expect(mockSessionCreate).not.toHaveBeenCalled();
    });

    it('should reject unknown email with generic UnauthorizedException', async () => {
      mockFindByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid email or password'));
    });

    it('should reject disabled accounts during login', async () => {
      const disabledUser = createSampleUser({
        accountStatus: AccountStatus.DISABLED,
      });
      mockFindByEmail.mockResolvedValue(disabledUser);
      mockComparePassword.mockResolvedValue(true);

      await expect(
        authService.login({
          email: 'student@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(new UnauthorizedException('User account has been disabled'));

      expect(mockSessionCreate).not.toHaveBeenCalled();
    });
  });

  describe('Refresh Token Rotation & Revocation', () => {
    it('should rotate refresh token and return new token pair', async () => {
      const rawToken = 'raw_refresh_token_to_rotate';
      const tokenHash = authService.hashToken(rawToken);

      const activeSession: RefreshTokenSession = {
        sessionId: 10,
        userId: 1,
        user: createSampleUser(),
        tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        isRevoked: false,
        replacedByTokenHash: null,
        userAgent: 'Browser',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionFindOne.mockResolvedValue(activeSession);
      mockSessionSave.mockResolvedValue(activeSession);

      const result = await authService.refresh(rawToken);

      expect(result.accessToken).toBe('mock_jwt_access_token');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken).not.toEqual(rawToken);

      // Verify rotation: old token is marked as replaced, session has new tokenHash
      expect(activeSession.replacedByTokenHash).toBe(tokenHash);
      expect(activeSession.tokenHash).toEqual(authService.hashToken(result.refreshToken));
      expect(mockSessionSave).toHaveBeenCalledWith(activeSession);
    });

    it('should detect refresh token reuse and revoke the session', async () => {
      const stolenOldToken = 'stolen_old_refresh_token';
      const oldHash = authService.hashToken(stolenOldToken);

      // First query (tokenHash) returns null because it was already rotated
      mockSessionFindOne.mockResolvedValueOnce(null);

      // Second query (replacedByTokenHash) finds the session rotated past grace period
      const rotatedPastGrace: RefreshTokenSession = {
        sessionId: 10,
        userId: 1,
        user: createSampleUser(),
        tokenHash: 'newer_token_hash',
        expiresAt: new Date(Date.now() + 1000000),
        isRevoked: false,
        replacedByTokenHash: oldHash,
        userAgent: 'Browser',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(Date.now() - 60000), // 60s ago, exceeds 30s grace window
      };
      mockSessionFindOne.mockResolvedValueOnce(rotatedPastGrace);

      await expect(authService.refresh(stolenOldToken)).rejects.toThrow(
        UnauthorizedException,
      );

      // Session must be marked revoked!
      expect(rotatedPastGrace.isRevoked).toBe(true);
      expect(mockSessionSave).toHaveBeenCalledWith(rotatedPastGrace);
    });

    it('should reject revoked refresh tokens', async () => {
      const revokedToken = 'revoked_refresh_token';
      const tokenHash = authService.hashToken(revokedToken);

      const revokedSession: RefreshTokenSession = {
        sessionId: 10,
        userId: 1,
        user: createSampleUser(),
        tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        isRevoked: true,
        replacedByTokenHash: null,
        userAgent: 'Browser',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionFindOne.mockResolvedValue(revokedSession);

      await expect(authService.refresh(revokedToken)).rejects.toThrow(
        new UnauthorizedException('Session has been revoked'),
      );
    });

    it('should reject expired refresh tokens', async () => {
      const expiredToken = 'expired_refresh_token';
      const tokenHash = authService.hashToken(expiredToken);

      const expiredSession: RefreshTokenSession = {
        sessionId: 10,
        userId: 1,
        user: createSampleUser(),
        tokenHash,
        expiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
        isRevoked: false,
        replacedByTokenHash: null,
        userAgent: 'Browser',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionFindOne.mockResolvedValue(expiredSession);

      await expect(authService.refresh(expiredToken)).rejects.toThrow(
        new UnauthorizedException('Refresh token has expired'),
      );
    });

    it('should reject invalid or non-existent refresh tokens', async () => {
      mockSessionFindOne.mockResolvedValue(null);

      await expect(authService.refresh('invalid_token_string')).rejects.toThrow(
        new UnauthorizedException('Invalid or expired refresh token'),
      );
    });

    it('should throw BadRequestException when refresh token is empty', async () => {
      await expect(authService.refresh('')).rejects.toThrow(BadRequestException);
    });

    it('should reject refresh and revoke session if user account has been disabled', async () => {
      const rawToken = 'valid_token_but_disabled_account';
      const tokenHash = authService.hashToken(rawToken);

      const disabledSession: RefreshTokenSession = {
        sessionId: 10,
        userId: 1,
        user: createSampleUser({ accountStatus: AccountStatus.DISABLED }),
        tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        isRevoked: false,
        replacedByTokenHash: null,
        userAgent: 'Browser',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionFindOne.mockResolvedValue(disabledSession);

      await expect(authService.refresh(rawToken)).rejects.toThrow(
        new UnauthorizedException('Account is disabled or no longer exists'),
      );
      expect(disabledSession.isRevoked).toBe(true);
      expect(mockSessionSave).toHaveBeenCalledWith(disabledSession);
    });
  });

  describe('Logout', () => {
    it('should invalidate the refresh token session on logout', async () => {
      const tokenToRevoke = 'logout_token';
      const tokenHash = authService.hashToken(tokenToRevoke);

      const activeSession: RefreshTokenSession = {
        sessionId: 15,
        userId: 1,
        user: createSampleUser(),
        tokenHash,
        expiresAt: new Date(Date.now() + 1000000),
        isRevoked: false,
        replacedByTokenHash: null,
        userAgent: 'Mobile',
        ipAddress: '127.0.0.1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSessionFindOne.mockResolvedValue(activeSession);

      const result = await authService.logout(tokenToRevoke);

      expect(result.success).toBe(true);
      expect(activeSession.isRevoked).toBe(true);
      expect(mockSessionSave).toHaveBeenCalledWith(activeSession);
    });
  });

  describe('Multiple Independent Sessions', () => {
    it('should support multiple independent sessions for the same user (e.g. Web and Mobile)', async () => {
      mockFindByEmail.mockResolvedValue(createSampleUser());
      mockComparePassword.mockResolvedValue(true);
      mockSessionCreate.mockImplementation((s) => s);
      mockSessionSave.mockResolvedValue({ sessionId: 1 });

      // First login (Web)
      const webLogin = await authService.login(
        { email: 'student@example.com', password: 'Password123!' },
        { userAgent: 'Mozilla Web Client' },
      );

      // Second login (Mobile App)
      const mobileLogin = await authService.login(
        { email: 'student@example.com', password: 'Password123!' },
        { userAgent: 'ReactNative Mobile Expo' },
      );

      // Both logins succeed and generate completely independent refresh tokens
      expect(webLogin.refreshToken).toBeDefined();
      expect(mobileLogin.refreshToken).toBeDefined();
      expect(webLogin.refreshToken).not.toEqual(mobileLogin.refreshToken);

      expect(mockSessionCreate).toHaveBeenCalledTimes(2);
      const webSessionArg = mockSessionCreate.mock.calls[0][0];
      const mobileSessionArg = mockSessionCreate.mock.calls[1][0];

      expect(webSessionArg.userId).toBe(1);
      expect(mobileSessionArg.userId).toBe(1);
      expect(webSessionArg.tokenHash).not.toEqual(mobileSessionArg.tokenHash);
    });
  });
});
