/// <reference types="multer" />
import { Test, TestingModule } from '@nestjs/testing';
import { CloudinaryService } from './cloudinary.service';
import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '@nestjs/common';
import * as streamifier from 'streamifier';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
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

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(cloudinary.config).toHaveBeenCalled();
  });

  describe('uploadFile', () => {
    it('should throw BadRequestException if file is not provided', async () => {
      await expect(
        service.uploadFile(
          null as unknown as Express.Multer.File,
          'test-folder',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should upload a file and return the result', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const mockResult = { secure_url: 'http://example.com/image.png' };

      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      uploadStreamMock.mockImplementation(
        (
          options: unknown,
          callback: (error: Error | null, result: unknown) => void,
        ) => {
          callback(null, mockResult);
          return { on: jest.fn() }; // Mock the returned stream object
        },
      );

      const result = await service.uploadFile(mockFile, 'test-folder');

      expect(result).toEqual(mockResult);
      expect(streamifier.createReadStream).toHaveBeenCalledWith(
        mockFile.buffer,
      );
    });

    it('should reject with an error if upload fails', async () => {
      const mockFile = { buffer: Buffer.from('test') } as Express.Multer.File;
      const mockError = new Error('Cloudinary error');

      const uploadStreamMock = cloudinary.uploader.upload_stream as jest.Mock;
      uploadStreamMock.mockImplementation(
        (
          options: unknown,
          callback: (error: Error | null, result: unknown) => void,
        ) => {
          callback(mockError, null);
          return { on: jest.fn() };
        },
      );

      await expect(service.uploadFile(mockFile, 'test-folder')).rejects.toThrow(
        'Cloudinary error',
      );
    });
  });
});
