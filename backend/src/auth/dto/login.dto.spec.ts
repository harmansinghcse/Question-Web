import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from './login.dto';

describe('LoginDto', () => {
  it('should pass validation with valid email and password', async () => {
    const input = {
      email: 'student@example.com',
      password: 'StrongPassword123!',
    };

    const dto = plainToInstance(LoginDto, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBe(0);
    expect(dto.email).toBe('student@example.com');
  });

  it('should trim and lowercase email', () => {
    const input = {
      email: '  STUDENT@EXAMPLE.COM  ',
      password: 'StrongPassword123!',
    };

    const dto = plainToInstance(LoginDto, input);
    expect(dto.email).toBe('student@example.com');
  });

  it('should fail validation when email is invalid', async () => {
    const input = {
      email: 'invalid-email',
      password: 'StrongPassword123!',
    };

    const dto = plainToInstance(LoginDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('should fail validation when password is empty', async () => {
    const input = {
      email: 'student@example.com',
      password: '',
    };

    const dto = plainToInstance(LoginDto, input);
    const errors = await validate(dto);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.property === 'password')).toBe(true);
  });
});
