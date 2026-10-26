import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { PasswordService } from './password.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenSession } from './entities/refresh-token-session.entity';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshTokenSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_ACCESS_SECRET',
          'questionweb_jwt_access_secret_development_fallback_key',
        ),
        signOptions: {
          expiresIn: (config.get<string>('JWT_ACCESS_EXPIRATION', '15m')) as unknown as number,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [PasswordService, AuthService, JwtStrategy],
  exports: [PasswordService, AuthService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
