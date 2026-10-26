import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, AccountStatus } from '../users/entities/user.entity';
import { RefreshTokenSession } from './entities/refresh-token-session.entity';
import { AuthResponse, SafeUser } from './interfaces/auth-response.interface';
import { JwtPayload } from './interfaces/jwt-payload.interface';

export interface RequestMetadata {
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresInDays: number = 7;
  // 30-second grace window to safely handle parallel/concurrent refresh requests
  private readonly concurrentGraceWindowMs = 30000;

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshTokenSession)
    private readonly sessionRepository: Repository<RefreshTokenSession>,
  ) {
    this.accessSecret = this.configService.get<string>(
      'JWT_ACCESS_SECRET',
      'questionweb_jwt_access_secret_development_fallback_key',
    );
    this.accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRATION',
      '15m',
    );
  }

  /**
   * Hashes a raw refresh token using SHA-256 before storage or query.
   * Plaintext refresh tokens are NEVER stored in the database.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a high-entropy cryptographically random refresh token.
   */
  private generateRawRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  /**
   * Prepares and registers a public user account.
   * Strictly enforces STUDENT role and prevents duplicate emails.
   */
  async register(dto: RegisterUserDto): Promise<SafeUser> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.passwordService.hashPassword(dto.password);

    try {
      const user = await this.usersService.create({
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
        role: UserRole.STUDENT,
        accountStatus: AccountStatus.ACTIVE,
      });

      const { passwordHash: _, ...safeUser } = user;
      return safeUser as SafeUser;
    } catch (err: unknown) {
      const error = err as { code?: string; errno?: number };
      if (error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062) {
        throw new ConflictException('An account with this email already exists');
      }
      throw err;
    }
  }

  /**
   * Authenticates a user and creates a new refresh token session.
   */
  async login(dto: LoginDto, metadata?: RequestMetadata): Promise<AuthResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.passwordService.comparePassword(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.accountStatus === AccountStatus.DISABLED) {
      throw new UnauthorizedException('User account has been disabled');
    }

    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as unknown as number,
    });

    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(
      Date.now() + this.refreshExpiresInDays * 24 * 60 * 60 * 1000,
    );

    const session = this.sessionRepository.create({
      userId: user.userId,
      tokenHash,
      expiresAt,
      isRevoked: false,
      replacedByTokenHash: null,
      userAgent: metadata?.userAgent?.slice(0, 255) ?? null,
      ipAddress: metadata?.ipAddress?.slice(0, 45) ?? null,
    });

    await this.sessionRepository.save(session);

    const { passwordHash: _, ...safeUser } = user;
    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: safeUser as SafeUser,
    };
  }

  /**
   * Rotates a refresh token session and returns new access + refresh tokens.
   * Detects reuse and safely handles concurrent requests.
   */
  async refresh(
    rawRefreshToken: string,
    metadata?: RequestMetadata,
  ): Promise<AuthResponse> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new BadRequestException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);

    const session = await this.sessionRepository.findOne({
      where: { tokenHash },
      relations: { user: true },
    });

    if (!session) {
      // Check if this token was already rotated (reuse detection)
      const replacedSession = await this.sessionRepository.findOne({
        where: { replacedByTokenHash: tokenHash },
        relations: { user: true },
      });

      if (replacedSession) {
        const timeSinceRotation =
          Date.now() - new Date(replacedSession.updatedAt).getTime();

        // If within concurrent grace window, tolerate parallel refresh from same client
        if (timeSinceRotation <= this.concurrentGraceWindowMs && !replacedSession.isRevoked) {
          const user =
            replacedSession.user ||
            (await this.usersService.findById(replacedSession.userId));

          if (user && user.accountStatus === AccountStatus.ACTIVE) {
            const payload: JwtPayload = {
              sub: user.userId,
              email: user.email,
              role: user.role,
            };
            const accessToken = await this.jwtService.signAsync(payload, {
              secret: this.accessSecret,
              expiresIn: this.accessExpiresIn as unknown as number,
            });

            const { passwordHash: _, ...safeUser } = user;
            return {
              accessToken,
              // Return empty or new refresh token
              refreshToken: rawRefreshToken,
              user: safeUser as SafeUser,
            };
          }
        }

        // Token reuse detected outside grace window: revoke the session
        replacedSession.isRevoked = true;
        await this.sessionRepository.save(replacedSession);
        throw new UnauthorizedException(
          'Refresh token reuse detected. Session has been revoked. Please log in again.',
        );
      }

      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.isRevoked) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user =
      session.user || (await this.usersService.findById(session.userId));
    if (!user || user.accountStatus === AccountStatus.DISABLED) {
      session.isRevoked = true;
      await this.sessionRepository.save(session);
      throw new UnauthorizedException('Account is disabled or no longer exists');
    }

    // Token Rotation: Generate new token pair
    const payload: JwtPayload = {
      sub: user.userId,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessExpiresIn as unknown as number,
    });

    const newRawRefreshToken = this.generateRawRefreshToken();
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const newExpiresAt = new Date(
      Date.now() + this.refreshExpiresInDays * 24 * 60 * 60 * 1000,
    );

    // Update the session: mark old token replaced, set new tokenHash
    session.replacedByTokenHash = tokenHash;
    session.tokenHash = newTokenHash;
    session.expiresAt = newExpiresAt;
    if (metadata?.userAgent) {
      session.userAgent = metadata.userAgent.slice(0, 255);
    }
    if (metadata?.ipAddress) {
      session.ipAddress = metadata.ipAddress.slice(0, 45);
    }

    await this.sessionRepository.save(session);

    const { passwordHash: _, ...safeUser } = user;
    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: safeUser as SafeUser,
    };
  }

  /**
   * Invalidates a refresh token session upon logout.
   */
  async logout(rawRefreshToken?: string): Promise<{ success: boolean; message: string }> {
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = this.hashToken(rawRefreshToken);
      const session = await this.sessionRepository.findOne({
        where: { tokenHash },
      });

      if (session) {
        session.isRevoked = true;
        await this.sessionRepository.save(session);
      }
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Revokes all active sessions for a user (e.g., password change or account disable).
   */
  async revokeAllUserSessions(userId: number): Promise<void> {
    await this.sessionRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }
}
