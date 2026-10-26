import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponse, SafeUser } from './interfaces/auth-response.interface';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly cookieOptions = {
    httpOnly: true,
    secure: this.isProduction,
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterUserDto): Promise<SafeUser> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip || req.socket?.remoteAddress;

    const result = await this.authService.login(dto, { userAgent, ipAddress });

    // Set secure HttpOnly cookie for web clients
    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);

    // Return tokens and safe user (React Native uses body, React Web uses cookie)
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const rawRefreshToken =
      req.cookies?.refreshToken ||
      dto.refreshToken ||
      (req.headers['x-refresh-token'] as string | undefined);

    if (!rawRefreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    const userAgent = req.headers['user-agent'] as string | undefined;
    const ipAddress = req.ip || req.socket?.remoteAddress;

    const result = await this.authService.refresh(rawRefreshToken, {
      userAgent,
      ipAddress,
    });

    // Rotate HttpOnly cookie for web clients
    res.cookie('refreshToken', result.refreshToken, this.cookieOptions);

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    const rawRefreshToken =
      req.cookies?.refreshToken ||
      dto.refreshToken ||
      (req.headers['x-refresh-token'] as string | undefined);

    const result = await this.authService.logout(rawRefreshToken);

    // Clear HttpOnly cookie on logout
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/auth',
    });

    return result;
  }
}
