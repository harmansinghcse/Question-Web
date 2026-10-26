import { PasswordService } from './password.service';
import { BadRequestException } from '@nestjs/common';

describe('PasswordService', () => {
  let service: PasswordService;

  beforeEach(() => {
    service = new PasswordService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword', () => {
    it('should hash a valid password into a bcrypt hash', async () => {
      const password = 'SuperSecretPassword123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toEqual(password);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should throw BadRequestException if password is under 8 characters', async () => {
      await expect(service.hashPassword('short')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if password is empty', async () => {
      await expect(service.hashPassword('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password and hash', async () => {
      const password = 'CorrectPassword99#';
      const hash = await service.hashPassword(password);

      const isValid = await service.comparePassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'CorrectPassword99#';
      const hash = await service.hashPassword(password);

      const isValid = await service.comparePassword('WrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should return false if password or hash is missing', async () => {
      expect(await service.comparePassword('', 'somehash')).toBe(false);
      expect(await service.comparePassword('pass', '')).toBe(false);
    });
  });
});
