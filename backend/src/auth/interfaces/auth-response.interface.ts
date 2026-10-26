import { User } from '../../users/entities/user.entity';

export type SafeUser = Omit<User, 'passwordHash'>;

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}
