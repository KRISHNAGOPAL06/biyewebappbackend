import { UpdatePhotoPrivacyDTO } from './privacy.dto.js';
import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';

export class PrivacyService {
    /**
     * Update photo privacy for all user's photos
     */
    async updatePhotoPrivacy(userId: string, dto: UpdatePhotoPrivacyDTO) {
        const { privacyLevel } = dto;

        // Get user's profile
        const profile = await prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Update all photos for this profile
        const result = await prisma.photo.updateMany({
            where: {
                profileId: profile.id,
                deletedAt: null,
            },
            data: {
                privacyLevel,
            },
        });

        logger.info('Photo privacy updated', {
            userId,
            profileId: profile.id,
            privacyLevel,
            photosUpdated: result.count,
        });

        return {
            message: 'Photo privacy updated successfully',
            privacyLevel,
            photosUpdated: result.count,
        };
    }

    /**
     * Get current privacy settings
     */
    async getPrivacySettings(userId: string) {
        // Get user's profile
        const profile = await prisma.profile.findUnique({
            where: { userId },
            select: {
                id: true,
                photos: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        privacyLevel: true,
                    },
                    take: 1,
                },
            },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        // Get the privacy level from the first photo, or default to 'connections'
        const photoPrivacy = profile.photos[0]?.privacyLevel || 'connections';

        return {
            photoPrivacy,
        };
    }
}

export const privacyService = new PrivacyService();
