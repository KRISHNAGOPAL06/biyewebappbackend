import { ModerationCallbackDTO } from './upload.dto.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import crypto from 'crypto';

import { prisma } from '../../prisma.js';

export class ModerationService {
  validateModerationSecret(providedSecret: string): boolean {
    const actualSecret = env.MODERATION_SECRET;

    if (!actualSecret) {
      logger.error('MODERATION_SECRET not configured');
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(actualSecret)
    );
  }

  async handleModerationCallback(dto: ModerationCallbackDTO): Promise<void> {
    const { objectKey, status, finalUrl, fileSize, mimeType, note } = dto;

    const photo = await prisma.photo.findFirst({
      where: { objectKey },
    });

    if (!photo) {
      logger.warn('Photo not found for moderation callback', { objectKey });
      throw new Error('Photo not found');
    }

    const updateData: any = {
      moderationStatus: status,
      uploadedAt: new Date(),
    };

    if (status === 'approved' && finalUrl) {
      updateData.url = finalUrl;
    }

    if (fileSize) {
      updateData.fileSize = fileSize;
    }

    if (mimeType) {
      updateData.mimeType = mimeType;
    }

    if (note) {
      updateData.moderationNote = note;
    }

    await prisma.photo.update({
      where: { id: photo.id },
      data: updateData,
    });

    logger.info('Photo moderation status updated', {
      photoId: photo.id,
      objectKey,
      status,
      finalUrl,
    });

    if (status === 'approved') {
      await this.onPhotoApproved(photo.id, photo.profileId);
    } else if (status === 'rejected') {
      await this.onPhotoRejected(photo.id, photo.profileId, note);
    }
  }

  private async onPhotoApproved(photoId: string, profileId: string): Promise<void> {
    logger.info('Photo approved - enqueuing discovery index update (stub)', {
      photoId,
      profileId,
    });
  }

  private async onPhotoRejected(photoId: string, profileId: string, reason?: string): Promise<void> {
    logger.info('Photo rejected - enqueuing owner notification (stub)', {
      photoId,
      profileId,
      reason,
    });
  }
}

export const moderationService = new ModerationService();
