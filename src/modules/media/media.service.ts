import { randomUUID } from 'crypto';
import path from 'path';
import { CreateUploadUrlDTO } from './upload.dto.js';
import { s3Service } from './s3.service.js';
import { cloudinaryService } from './cloudinary.service.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { localStorageService } from './local/local.storage.service.js';
import { entitlementService } from '../payments/entitlement.service.js';

import { prisma } from '../../prisma.js';

export interface UploadUrlResponse {
  uploadUrl: string;
  objectKey: string;
  expiresIn: number;
  uploadMethod: 'PUT' | 'POST';
  photoId: string;
}

export interface PhotoMetadata {
  id: string;
  profileId: string;
  objectKey: string | null;
  url: string | null;
  fileSize: number | null;
  mimeType: string | null;
  privacyLevel: string;
  moderationStatus: string;
  moderationNote: string | null;
  createdAt: Date;
  uploadedAt: Date | null;
}

export class MediaService {
  async createUploadUrl(dto: CreateUploadUrlDTO, requesterId: string): Promise<UploadUrlResponse> {
    const { profileId, filename, mimeType, fileSize, privacyLevel } = dto;

    await this.validateUploadRequest(dto);

    await this.authorizeProfileOwner(profileId, requesterId);

    // Check tier-based photo limit
    const currentPhotoCount = await prisma.photo.count({
      where: { profileId, deletedAt: null }
    });

    // MINIMUM 2 photos allowed for ALL users (1 profile + 1 selfie for registration)
    const FREE_PHOTO_LIMIT = 2;

    // Get subscription features if available
    const features = await entitlementService.getProfileFeatures(profileId);

    // Determine max photos: use subscription limit if higher than free limit, otherwise use free limit
    const subscriptionPhotos = features?.photos ?? 0;
    const maxPhotos = Math.max(FREE_PHOTO_LIMIT, subscriptionPhotos);

    // Check if within photo limit
    if (currentPhotoCount >= maxPhotos) {
      if (subscriptionPhotos > FREE_PHOTO_LIMIT) {
        throw new Error(`PHOTO_LIMIT_EXCEEDED: You can upload maximum ${maxPhotos} photos with your current plan.`);
      } else {
        throw new Error(`PHOTO_LIMIT_EXCEEDED: Free accounts can upload maximum ${FREE_PHOTO_LIMIT} photos. Please subscribe for more.`);
      }
    }

    const sanitizedFilename = this.sanitizeFilename(filename);
    const objectKey = this.generateObjectKey(profileId, sanitizedFilename);

    const photo = await prisma.photo.create({
      data: {
        profileId,
        objectKey,
        fileSize,
        mimeType,
        privacyLevel,
        moderationStatus: 'approved', // Auto-approve photos without admin review
      },
    });

    logger.info('Photo metadata created for upload', {
      photoId: photo.id,
      profileId,
      objectKey,
      requesterId,
      currentPhotoCount: currentPhotoCount + 1,
    });

    const uploadResult = await this.generateSignedUploadUrl(objectKey, mimeType, fileSize);

    await this.enqueueModerationJob(photo.id, objectKey, profileId);

    return {
      uploadUrl: uploadResult.url,
      objectKey,
      expiresIn: env.UPLOAD_URL_EXPIRY_SECONDS,
      uploadMethod: env.UPLOAD_PROVIDER === 's3' ? 'PUT' : 'POST',
      photoId: photo.id,
    };
  }

  async uploadFile(photoId: string, requesterId: string, buffer: Buffer): Promise<PhotoMetadata> {
    const photo = await prisma.photo.findUnique({ where: { id: photoId } });
    if (!photo) throw new Error('Photo not found');
    if (!photo.objectKey) throw new Error('Invalid photo objectKey');

    const url = await localStorageService.saveFile(photo.objectKey, buffer);

    await prisma.photo.update({ where: { id: photoId }, data: { uploadedAt: new Date(), url } });
    console.log("photoId: " + photoId)
    const result = await this.getPhotoById(photoId, requesterId);
    console.log("result: " + result)

    if (!result) throw new Error('Failed to retrieve uploaded photo');
    return result;
  }

  async getPhotoById(photoId: string, requesterId?: string): Promise<PhotoMetadata | null> {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { profile: true },
    });
    console.log("photo: ", requesterId)


    if (!photo) {
      return null;
    }

    /*It will be validated later*/

    const canView = await this.checkPhotoViewPermission(photo, requesterId);
    console.log("canView: ", canView)

    if (!canView) {
      return null;
    }
    /*It will be validated later*/


    return this.sanitizePhotoMetadata(photo);
  }

  async getPhotoFile(photoId: string, requesterId?: string): Promise<{ path: string, mimeType: string } | null> {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { profile: true },
    });

    if (!photo || !photo.objectKey) return null;

    // Check permissions
    const canView = await this.checkPhotoViewPermission(photo, requesterId);
    if (!canView) return null;

    const fullPath = path.resolve(process.cwd(), 'uploads', photo.objectKey);
    return {
      path: fullPath,
      mimeType: 'image/jpeg' // You might want to store/infer proper mime type
    };
  }

  // async deletePhoto(photoId: string, requesterId: string): Promise<void> {
  //   const photo = await prisma.photo.findUnique({
  //     where: { id: photoId },
  //     include: { profile: true },
  //   });

  //   if (!photo) {
  //     throw new Error('Photo not found');
  //   }

  //   await this.authorizeProfileOwner(photo.profileId, requesterId);

  //   await prisma.photo.update({
  //     where: { id: photoId },
  //     data: { deletedAt: new Date() },
  //   });

  //   logger.info('Photo marked for deletion', { photoId, requesterId });

  //   if (photo.objectKey) {
  //     await this.enqueueDeletionJob(photo.objectKey);
  //   }
  // }

  async deletePhoto(photoId: string, requesterId: string): Promise<void> {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { profile: true },
    });

    if (!photo) {
      throw new Error('Photo not found');
    }

    await this.authorizeProfileOwner(photo.profileId, requesterId);

    logger.info('Photo marked for deletion', { photoId, requesterId });

    if (photo.objectKey) {
      await this.enqueueDeletionJob(photo.objectKey);
    }

    await prisma.photo.delete({
      where: { id: photoId },
    });
  }

  async updatePhotoPrivacyForProfile(
    profileId: string,
    requesterId: string,
    newPrivacyLevel: 'public' | 'matches' | 'on_request' | 'private'
  ): Promise<{ updatedCount: number }> {
    // Validate requester is allowed to modify this profile
    await this.authorizeProfileOwner(profileId, requesterId);

    // Validate privacy level
    const allowedLevels = ['public', 'matches', 'on_request', 'private'];
    if (!allowedLevels.includes(newPrivacyLevel)) {
      throw new Error(`Invalid privacy level: ${newPrivacyLevel}`);
    }

    // Update photos
    const result = await prisma.photo.updateMany({
      where: {
        profileId,
        deletedAt: null,
      },
      data: {
        privacyLevel: newPrivacyLevel,
      },
    });

    // Logging
    logger.info('Updated photo privacy levels', {
      profileId,
      requesterId,
      newPrivacyLevel,
      updatedCount: result.count,
    });

    return { updatedCount: result.count };
  }


  async listProfilePhotos(profileId: string, requesterId?: string): Promise<PhotoMetadata[]> {
    const photos = await prisma.photo.findMany({
      where: {
        profileId,
        deletedAt: null,
      },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });

    const filteredPhotos = await Promise.all(
      photos.map(async (photo: any) => {
        const canView = await this.checkPhotoViewPermission(photo, requesterId);
        return canView ? this.sanitizePhotoMetadata(photo) : null;
      })
    );

    return filteredPhotos.filter((p): p is PhotoMetadata => p !== null);
  }

  private async validateUploadRequest(dto: CreateUploadUrlDTO): Promise<void> {
    if (!env.ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new Error(`MIME type ${dto.mimeType} is not allowed`);
    }

    if (dto.fileSize > env.MAX_UPLOAD_BYTES) {
      throw new Error(
        `File size ${dto.fileSize} exceeds maximum allowed ${env.MAX_UPLOAD_BYTES} bytes`
      );
    }
  }

  // private async authorizeProfileOwner(profileId: string, userId: string): Promise<void> {
  //   const profile = await prisma.profile.findUnique({
  //     where: { id: profileId },
  //     select: { userId: true },
  //   });

  //   if (!profile) {
  //     throw new Error('Profile not found');
  //   }

  //   if (profile.userId !== userId) {
  //     throw new Error('Unauthorized: You can only upload photos to your own profile');
  //   }
  // }

  private async authorizeProfileOwner(profileId: string, userId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('user not found');
    }

    if (user.role === 'self' || user.role === 'candidate') {
      if (profile.userId !== userId) {
        throw new Error('Unauthorized: You can only upload photos to your own profile');
      }
      return;
    }

    if (user.role === 'parent') {
      const link = await prisma.candidateLink.findFirst({
        where: {
          parentUserId: userId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      if (!link || link.profile.userId !== profile.userId) {
        throw new Error('Unauthorized: You can only upload photos to a linked candidate profile');
      }

      return;
    }

    // Any other role is not allowed
    throw new Error('Unauthorized: You do not have permission to upload photos to this profile');
  }


  private generateObjectKey(profileId: string, filename: string): string {
    const uuid = randomUUID();
    return `profiles/${profileId}/${uuid}_${filename}`;
  }

  private sanitizeFilename(filename: string): string {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  private async generateSignedUploadUrl(
    objectKey: string,
    contentType: string,
    fileSize: number
  ): Promise<{ url: string }> {
    if (env.UPLOAD_PROVIDER === 'local') {
      const result = await localStorageService.createLocalUploadUrl(objectKey);
      return { url: result.url };
    }
    if (env.UPLOAD_PROVIDER === 's3') {
      const result = await s3Service.createPresignedPutUrl({
        bucket: env.AWS_S3_BUCKET || '',
        key: objectKey,
        contentType,
        expiresSeconds: env.UPLOAD_URL_EXPIRY_SECONDS,
      });

      return { url: result.url };
    } else {
      const result = await cloudinaryService.createSignedUploadParams({
        publicId: objectKey,
        folder: 'profiles',
        maxBytes: fileSize,
      });

      return { url: result.uploadUrl };
    }
  }

  // private async checkPhotoViewPermission(photo: any, requesterId?: string): Promise<boolean> {
  //   if (photo.moderationStatus !== 'approved' && photo.profile.userId !== requesterId) {
  //     return false;
  //   }

  //   if (photo.privacyLevel === 'public') {
  //     return true;
  //   }

  //   if (!requesterId) {
  //     return true; /*Statically true, later it will be implemented*/
  //   }

  //   if (photo.profile.userId === requesterId) {
  //     return true;
  //   }

  //   if (photo.privacyLevel === 'private') {
  //     return false;
  //   }

  //   return false;
  // }
  private async checkPhotoViewPermission(photo: any, requesterId?: string): Promise<boolean> {
    // 1. If public and approved, anyone can view (even unauthenticated)
    if (photo.privacyLevel === 'public' && photo.moderationStatus === 'approved') {
      return true;
    }

    // 2. If valid auth logic required but missing requester
    if (!requesterId) {
      return false;
    }

    const user = await prisma.user.findUnique({ where: { id: requesterId } });

    if (!user) {
      return false;
    }

    let isOwnerOrLinked = false;

    if (user.role === 'self' || user.role === 'candidate') {
      isOwnerOrLinked = photo.profile.userId === requesterId;
    } else if (user.role === 'parent') {
      const link = await prisma.candidateLink.findFirst({
        where: {
          parentUserId: requesterId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      isOwnerOrLinked = link?.profile.userId === photo.profile.userId;
    }

    // Moderation: only owner/linked can see unapproved photos
    if (photo.moderationStatus !== 'approved' && !isOwnerOrLinked) {
      return false;
    }

    // Public photos are always visible
    if (photo.privacyLevel === 'public') {
      return true;
    }

    // Owner or linked parent can see non-public photos
    if (isOwnerOrLinked) {
      return true;
    }

    // Explicitly private: only owner/linked
    if (photo.privacyLevel === 'private') {
      return false;
    }

    return false;
  }

  private sanitizePhotoMetadata(photo: any): PhotoMetadata {
    return {
      id: photo.id,
      profileId: photo.profileId,
      objectKey: photo.objectKey,
      url: photo.url,
      fileSize: photo.fileSize,
      mimeType: photo.mimeType,
      privacyLevel: photo.privacyLevel,
      moderationStatus: photo.moderationStatus,
      moderationNote: photo.moderationNote,
      createdAt: photo.createdAt,
      uploadedAt: photo.uploadedAt,
    };
  }

  private async enqueueModerationJob(
    photoId: string,
    objectKey: string,
    profileId: string
  ): Promise<void> {
    logger.info('Enqueuing moderation job (stub)', { photoId, objectKey, profileId });
  }

  // private async enqueueDeletionJob(objectKey: string): Promise<void> {
  //   logger.info('Enqueuing deletion job (stub)', { objectKey });
  // }
  private async enqueueDeletionJob(objectKey: string): Promise<void> {
    try {
      if (env.UPLOAD_PROVIDER === 'local') {
        // Delete from local filesystem
        await localStorageService.deleteFile(objectKey);
        logger.info('Local file deleted', { objectKey });
        return;
      }

      // TODO: implement real deletion for other providers
      if (env.UPLOAD_PROVIDER === 's3') {
        logger.info('Enqueuing S3 deletion job (not implemented yet)', { objectKey });
        // e.g. await s3Service.deleteObject({ bucket: env.AWS_S3_BUCKET || '', key: objectKey });
        return;
      }

      // Cloudinary or other providers
      logger.info('Enqueuing cloud provider deletion job (not implemented yet)', {
        objectKey,
        provider: env.UPLOAD_PROVIDER,
      });
      // e.g. await cloudinaryService.deleteResource(objectKey);
    } catch (error) {
      logger.error('Error deleting media object', { objectKey, error });
      // Decide if you want to rethrow or just log
    }
  }
}

export const mediaService = new MediaService();
