import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface CloudinarySignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Generates a signed parameter set for client-side upload.
   * The CLOUDINARY_API_SECRET remains strictly on the server and is never exposed.
   */
  getUploadSignature(): CloudinarySignatureResponse {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    const folder = this.configService.get<string>(
      'CLOUDINARY_UPLOAD_FOLDER',
      'question_web_images',
    );

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        'Cloudinary credentials are not configured in environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)',
      );
      throw new ServiceUnavailableException(
        'Cloudinary image upload service is not configured on the server.',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Cloudinary signature rule: parameters to sign must be alphabetical
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

    const signature = crypto
      .createHash('sha1')
      .update(paramsToSign + apiSecret)
      .digest('hex');

    return {
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    };
  }
}
