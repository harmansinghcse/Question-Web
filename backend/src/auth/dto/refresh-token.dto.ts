import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString({ message: 'refreshToken must be a string' })
  refreshToken?: string;
}
