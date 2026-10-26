import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterUserDto } from './register-user.dto';

describe('RegisterUserDto', () => {
  it('should pass validation with valid properties', async () => {
    const input = {
      email: 'student@example.com',
      password: 'SecurePassword123!',
      displayName: 'Jane Doe',
    };

    const dto = plainToInstance(RegisterUserDto, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBe(0);
    expect(dto.email).toBe('student@example.com');
  });

  it('should trim and lowercase email and displayName', () => {
    const input = {
      email: '  STUDENT@EXAMPLE.COM  ',
      password: 'SecurePassword123!',
      displayName: '  Jane Doe  ',
    };

    const dto = plainToInstance(RegisterUserDto, input);
    expect(dto.email).toBe('student@example.com');
    expect(dto.displayName).toBe('Jane Doe');
  });

  it('should fail validation when email is invalid', async () => {
    const input = {
      email: 'not-an-email',
      password: 'SecurePassword123!',
      displayName: 'Jane Doe',
    };

    const dto = plainToInstance(RegisterUserDto, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('email');
  });

  it('should fail validation when password is under 8 characters', async () => {
    const input = {
      email: 'student@example.com',
      password: 'short',
      displayName: 'Jane Doe',
    };

    const dto = plainToInstance(RegisterUserDto, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('password');
  });

  it('should reject unwhitelisted properties such as role under strict validation', async () => {
    const input = {
      email: 'student@example.com',
      password: 'SecurePassword123!',
      displayName: 'Jane Doe',
      role: 'ADMIN',
    };

    const dto = plainToInstance(RegisterUserDto, input);
    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((err) => err.property === 'role')).toBe(true);
  });
});
