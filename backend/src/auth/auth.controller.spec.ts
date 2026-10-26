import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserRole, AccountStatus } from '../users/entities/user.entity';

describe('AuthController', () => {
  let controller: AuthController;
  const mockRegister = jest.fn();
  const mockLogin = jest.fn();
  const mockRefresh = jest.fn();
  const mockLogout = jest.fn();

  const mockSafeUser = {
    userId: 1,
    email: 'student@example.com',
    displayName: 'Student One',
    role: UserRole.STUDENT,
    accountStatus: AccountStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse = {
    accessToken: 'access_jwt_123',
    refreshToken: 'refresh_raw_456',
    user: mockSafeUser,
  };

  beforeEach(async () => {
    mockRegister.mockReset();
    mockLogin.mockReset();
    mockRefresh.mockReset();
    mockLogout.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: mockRegister,
            login: mockLogin,
            refresh: mockRefresh,
            logout: mockLogout,
          },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /auth/register', () => {
    it('should call authService.register and return safe user', async () => {
      mockRegister.mockResolvedValue(mockSafeUser);

      const dto = {
        email: 'student@example.com',
        password: 'Password123!',
        displayName: 'Student One',
      };

      const result = await controller.register(dto);
      expect(mockRegister).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockSafeUser);
      expect((result as any).passwordHash).toBeUndefined();
    });
  });

  describe('POST /auth/login', () => {
    it('should set HttpOnly cookie for web and return tokens and user for mobile', async () => {
      mockLogin.mockResolvedValue(mockAuthResponse);

      const dto = { email: 'student@example.com', password: 'Password123!' };
      const req: any = { headers: { 'user-agent': 'Jest' }, ip: '127.0.0.1' };
      const res: any = { cookie: jest.fn() };

      const result = await controller.login(dto, req, res);

      expect(mockLogin).toHaveBeenCalledWith(dto, {
        userAgent: 'Jest',
        ipAddress: '127.0.0.1',
      });
      // Verifies HttpOnly cookie is set for Web
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh_raw_456',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
        }),
      );
      // Verifies response body contains tokens and user for React Native
      expect(result.accessToken).toBe('access_jwt_123');
      expect(result.refreshToken).toBe('refresh_raw_456');
      expect(result.user).toEqual(mockSafeUser);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh using cookie from web request', async () => {
      mockRefresh.mockResolvedValue(mockAuthResponse);

      const dto = {};
      const req: any = {
        cookies: { refreshToken: 'cookie_refresh_token' },
        headers: {},
      };
      const res: any = { cookie: jest.fn() };

      const result = await controller.refresh(dto, req, res);

      expect(mockRefresh).toHaveBeenCalledWith('cookie_refresh_token', expect.any(Object));
      expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken',
        'refresh_raw_456',
        expect.any(Object),
      );
      expect(result.accessToken).toBe('access_jwt_123');
    });

    it('should refresh using body from mobile app request', async () => {
      mockRefresh.mockResolvedValue(mockAuthResponse);

      const dto = { refreshToken: 'mobile_body_refresh_token' };
      const req: any = { cookies: {}, headers: {} };
      const res: any = { cookie: jest.fn() };

      const result = await controller.refresh(dto, req, res);

      expect(mockRefresh).toHaveBeenCalledWith(
        'mobile_body_refresh_token',
        expect.any(Object),
      );
      expect(result.accessToken).toBe('access_jwt_123');
      expect(result.refreshToken).toBe('refresh_raw_456');
    });

    it('should throw BadRequestException if no refresh token is provided', async () => {
      const dto = {};
      const req: any = { cookies: {}, headers: {} };
      const res: any = { cookie: jest.fn() };

      await expect(controller.refresh(dto, req, res)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('POST /auth/logout', () => {
    it('should call authService.logout and clear HttpOnly cookie', async () => {
      mockLogout.mockResolvedValue({ success: true, message: 'Logged out successfully' });

      const dto = {};
      const req: any = {
        cookies: { refreshToken: 'cookie_token' },
        headers: {},
      };
      const res: any = { clearCookie: jest.fn() };

      const result = await controller.logout(dto, req, res);

      expect(mockLogout).toHaveBeenCalledWith('cookie_token');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expect.objectContaining({
          httpOnly: true,
          path: '/api/auth',
        }),
      );
      expect(result.success).toBe(true);
    });
  });
});
