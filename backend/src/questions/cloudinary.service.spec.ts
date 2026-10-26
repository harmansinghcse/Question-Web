import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { CloudinaryService } from './cloudinary.service';

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudinaryService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const env: Record<string, string> = {
                CLOUDINARY_CLOUD_NAME: 'test_cloud',
                CLOUDINARY_API_KEY: 'test_api_key',
                CLOUDINARY_API_SECRET: 'test_secret',
                CLOUDINARY_UPLOAD_FOLDER: 'test_folder',
              };
              return env[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a valid upload signature', () => {
    const result = service.getUploadSignature();

    expect(result.cloudName).toBe('test_cloud');
    expect(result.apiKey).toBe('test_api_key');
    expect(result.folder).toBe('test_folder');
    expect(typeof result.timestamp).toBe('number');
    expect(typeof result.signature).toBe('string');
    expect(result.signature).toHaveLength(40); // SHA-1 hex string length

    // Verify signature formula: sha1(folder=...&timestamp=... + secret)
    const expected = crypto
      .createHash('sha1')
      .update(`folder=test_folder&timestamp=${result.timestamp}test_secret`)
      .digest('hex');
    expect(result.signature).toBe(expected);
  });

  it('should throw ServiceUnavailableException if credentials are missing', () => {
    jest.spyOn(configService, 'get').mockReturnValue(undefined as never);

    expect(() => service.getUploadSignature()).toThrow(
      ServiceUnavailableException,
    );
  });
});
