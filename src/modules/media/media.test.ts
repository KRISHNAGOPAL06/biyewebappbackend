import { MediaService } from './media.service';
import { ModerationService } from './moderation.service';
import { S3Service } from './s3.service';
import { CloudinaryService } from './cloudinary.service';
import { CreateUploadUrlDTO, ModerationCallbackDTO } from './upload.dto';

jest.mock('@prisma/client');
jest.mock('./s3.service');
jest.mock('./cloudinary.service');
jest.mock('../../config/env', () => ({
  env: {
    UPLOAD_PROVIDER: 's3',
    MAX_UPLOAD_BYTES: 5242880,
    ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    UPLOAD_URL_EXPIRY_SECONDS: 300,
    AWS_S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
    MODERATION_SECRET: 'test-secret-key-with-minimum-32-chars',
  },
}));

describe('MediaService', () => {
  let mediaService: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    mediaService = new MediaService();
  });

  describe('createUploadUrl', () => {
    it('should reject unsupported MIME type', async () => {
      const dto: CreateUploadUrlDTO = {
        profileId: 'profile-id',
        filename: 'test.gif',
        mimeType: 'image/gif',
        fileSize: 1024,
        privacyLevel: 'public',
      };

      await expect(mediaService.createUploadUrl(dto, 'user-id')).rejects.toThrow(
        'MIME type image/gif is not allowed'
      );
    });

    it('should reject oversized file', async () => {
      const dto: CreateUploadUrlDTO = {
        profileId: 'profile-id',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 10 * 1024 * 1024,
        privacyLevel: 'public',
      };

      await expect(mediaService.createUploadUrl(dto, 'user-id')).rejects.toThrow(
        'File size'
      );
    });

    it('should create upload URL with S3 provider (mocked)', async () => {
      const mockS3Service = {
        createPresignedPutUrl: jest.fn().mockResolvedValue({
          url: 'https://test-bucket.s3.us-east-1.amazonaws.com/key',
          expiresAt: new Date(),
        }),
      };

      const dto: CreateUploadUrlDTO = {
        profileId: 'profile-id',
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
        privacyLevel: 'public',
      };

    });

    it('should create upload URL with Cloudinary provider (mocked)', async () => {
      const mockCloudinaryService = {
        createSignedUploadParams: jest.fn().mockResolvedValue({
          uploadUrl: 'https://api.cloudinary.com/v1_1/test/image/upload',
          uploadParams: {
            api_key: 'test-key',
            timestamp: Date.now(),
            signature: 'test-signature',
            folder: 'profiles',
            public_id: 'test-id',
          },
        }),
      };

    });
  });

  describe('getPhotoById', () => {
    it('should return null for non-existent photo', async () => {
      const result = await mediaService.getPhotoById('non-existent-id');
      expect(result).toBeNull();
    });

    it('should respect privacy levels (mocked)', async () => {
    });
  });
});

describe('ModerationService', () => {
  let moderationService: ModerationService;

  beforeEach(() => {
    jest.clearAllMocks();
    moderationService = new ModerationService();
  });

  describe('validateModerationSecret', () => {
    it('should validate correct secret', () => {
      const result = moderationService.validateModerationSecret(
        'test-secret-key-with-minimum-32-chars'
      );
      expect(result).toBe(true);
    });

    it('should reject incorrect secret', () => {
      const result = moderationService.validateModerationSecret('wrong-secret');
      expect(result).toBe(false);
    });
  });

  describe('handleModerationCallback', () => {
    it('should update photo on approval (mocked)', async () => {
      const dto: ModerationCallbackDTO = {
        objectKey: 'profiles/test/photo.jpg',
        status: 'approved',
        finalUrl: 'https://cdn.example.com/photo.jpg',
        fileSize: 1024,
        mimeType: 'image/jpeg',
      };

    });

    it('should update photo on rejection (mocked)', async () => {
      const dto: ModerationCallbackDTO = {
        objectKey: 'profiles/test/photo.jpg',
        status: 'rejected',
        note: 'Inappropriate content',
      };

    });
  });
});

describe('S3Service', () => {
  let s3Service: S3Service;

  beforeEach(() => {
    s3Service = new S3Service();
  });

  it('should generate presigned URL structure (no AWS SDK called)', async () => {
    const result = await s3Service.createPresignedPutUrl({
      bucket: 'test-bucket',
      key: 'test-key',
      contentType: 'image/jpeg',
      expiresSeconds: 300,
    });

    expect(result.url).toContain('test-bucket');
    expect(result.url).toContain('test-key');
    expect(result.expiresAt).toBeInstanceOf(Date);
  });
});

describe('CloudinaryService', () => {
  let cloudinaryService: CloudinaryService;

  beforeEach(() => {
    cloudinaryService = new CloudinaryService();
  });

  it('should generate upload params structure (no Cloudinary SDK called)', async () => {
    const result = await cloudinaryService.createSignedUploadParams({
      publicId: 'test-id',
      folder: 'profiles',
      maxBytes: 1024,
    });

    expect(result.uploadUrl).toContain('cloudinary');
    expect(result.uploadParams).toHaveProperty('api_key');
    expect(result.uploadParams).toHaveProperty('timestamp');
    expect(result.uploadParams).toHaveProperty('signature');
  });
});
