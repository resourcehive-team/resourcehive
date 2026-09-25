import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

export const AVATAR_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_DIMENSION = 256;

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadAvatar(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadApiResponse> {
    if (!file?.buffer) {
      return Promise.reject(new BadRequestException('File is required'));
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: `avatars/${userId}`,
          overwrite: true,
          invalidate: true,
          format: 'webp',
          timeout: 20_000,
          transformation: [
            {
              width: AVATAR_MAX_DIMENSION,
              height: AVATAR_MAX_DIMENSION,
              crop: 'fill',
              gravity: 'center',
              quality: 'auto:good',
            },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary avatar upload failed: ${error.message}`,
            );
            if (/timeout/i.test(error.message)) {
              return reject(
                new GatewayTimeoutException(
                  'The image service timed out. Please try again.',
                ),
              );
            }
            return reject(
              new BadGatewayException(
                'The image service could not process this upload.',
              ),
            );
          }
          if (
            !result ||
            result.resource_type !== 'image' ||
            result.format !== 'webp' ||
            result.width !== AVATAR_MAX_DIMENSION ||
            result.height !== AVATAR_MAX_DIMENSION ||
            !result.secure_url
          ) {
            this.logger.error('Cloudinary returned an invalid avatar result');
            return reject(
              new BadGatewayException(
                'The image service returned an invalid result.',
              ),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteAvatar(userId: string): Promise<void> {
    await new Promise<void>((resolve) => {
      void cloudinary.uploader.destroy(
        `avatars/${userId}`,
        { resource_type: 'image', invalidate: true },
        (error: unknown) => {
          if (error) {
            const message =
              error instanceof Error ? error.message : 'unknown error';
            this.logger.warn(
              `Cloudinary avatar deletion failed for ${userId}: ${message}`,
            );
          }
          resolve();
        },
      );
    });
  }
}
