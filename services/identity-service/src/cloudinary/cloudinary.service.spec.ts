import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { AVATAR_MAX_DIMENSION, CloudinaryService } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

jest.mock('streamifier', () => ({
  createReadStream: jest.fn().mockReturnValue({
    pipe: jest.fn(),
  }),
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [CloudinaryService],
    }).compile();

    service = module.get<CloudinaryService>(CloudinaryService);
  });

  it('configures Cloudinary', () => {
    expect(service).toBeDefined();
    expect(cloudinary.config).toHaveBeenCalled();
  });

  describe('uploadAvatar', () => {
    it('rejects a missing file', async () => {
      await expect(service.uploadAvatar(null, 'user-1')).rejects.toThrow(
        'File is required',
      );
    });

    it('uploads a normalized avatar with deterministic storage options', async () => {
      const mockFile = {
        buffer: Buffer.from('image'),
      } as Express.Multer.File;
      const mockResult = {
        secure_url: 'https://example.com/avatar.webp',
        resource_type: 'image',
        format: 'webp',
        width: AVATAR_MAX_DIMENSION,
        height: AVATAR_MAX_DIMENSION,
      };
      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      uploadStreamMock.mockImplementation(
        (
          options: Record<string, unknown>,
          callback: (error: Error | null, result: unknown) => void,
        ) => {
          expect(options).toMatchObject({
            resource_type: 'image',
            public_id: 'avatars/user-1',
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
          });
          callback(null, mockResult);
          return { on: jest.fn() };
        },
      );

      const result = await service.uploadAvatar(mockFile, 'user-1');

      expect(result).toEqual(mockResult);
      expect(streamifier.createReadStream).toHaveBeenCalledWith(
        mockFile.buffer,
      );
    });

    it('sanitizes provider failures', async () => {
      const mockFile = {
        buffer: Buffer.from('image'),
      } as Express.Multer.File;
      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      uploadStreamMock.mockImplementation(
        (
          _options: unknown,
          callback: (error: Error | null, result: unknown) => void,
        ) => {
          callback(new Error('Cloudinary error'), null);
          return { on: jest.fn() };
        },
      );

      await expect(service.uploadAvatar(mockFile, 'user-1')).rejects.toThrow(
        BadGatewayException,
      );
    });

    it('maps provider timeouts to gateway timeouts', async () => {
      const mockFile = {
        buffer: Buffer.from('image'),
      } as Express.Multer.File;
      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      uploadStreamMock.mockImplementation(
        (
          _options: unknown,
          callback: (error: Error | null, result: unknown) => void,
        ) => {
          callback(new Error('Request Timeout'), null);
          return { on: jest.fn() };
        },
      );

      await expect(service.uploadAvatar(mockFile, 'user-1')).rejects.toThrow(
        GatewayTimeoutException,
      );
    });

    it('rejects an unnormalized Cloudinary result', async () => {
      const mockFile = {
        buffer: Buffer.from('image'),
      } as Express.Multer.File;
      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      uploadStreamMock.mockImplementation(
        (
          _options: unknown,
          callback: (error: Error | null, result: unknown) => void,
        ) => {
          callback(null, {
            secure_url: 'https://example.com/original.jpg',
            resource_type: 'image',
            format: 'jpg',
            width: 1920,
            height: 1080,
          });
          return { on: jest.fn() };
        },
      );

      await expect(service.uploadAvatar(mockFile, 'user-1')).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('deleteAvatar', () => {
    it('deletes the deterministic avatar and resolves provider failures', async () => {
      const destroyMock = cloudinary.uploader.destroy as jest.Mock;
      destroyMock.mockImplementation(
        (
          publicId: string,
          options: Record<string, unknown>,
          callback: (error: Error | null) => void,
        ) => {
          expect(publicId).toBe('avatars/user-1');
          expect(options).toEqual({ resource_type: 'image', invalidate: true });
          callback(new Error('Cloudinary unavailable'));
        },
      );

      await expect(service.deleteAvatar('user-1')).resolves.toBeUndefined();
    });
  });
});
