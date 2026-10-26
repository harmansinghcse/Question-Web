import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = unknown>(
    err: unknown,
    user: unknown,
  ): TUser {
    if (err || !user) {
      return null as TUser;
    }
    return user as TUser;
  }
}
