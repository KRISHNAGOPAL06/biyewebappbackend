import { BlockUserDTO } from './block.dto.js';
import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';

export class BlockService {
    /**
     * Block a user
     */
    async blockUser(blockerUserId: string, dto: BlockUserDTO) {
        const { blockedUserId, reason } = dto;

        // Prevent self-blocking
        if (blockerUserId === blockedUserId) {
            throw new Error('You cannot block yourself');
        }

        // Check if already blocked
        const existingBlock = await prisma.blockedUser.findFirst({
            where: {
                blockerUserId,
                blockedUserId,
            },
        });

        if (existingBlock) {
            logger.info('User already blocked', {
                blockerUserId,
                blockedUserId,
            });
            return {
                id: existingBlock.id,
                message: 'User is already blocked',
                createdAt: existingBlock.createdAt,
            };
        }

        // Create block
        const block = await prisma.blockedUser.create({
            data: {
                blockerUserId,
                blockedUserId,
                reason,
            },
        });

        logger.info('User blocked successfully', {
            blockId: block.id,
            blockerUserId,
            blockedUserId,
        });

        return {
            id: block.id,
            message: 'User blocked successfully',
            createdAt: block.createdAt,
        };
    }

    /**
     * Unblock a user
     */
    async unblockUser(blockerUserId: string, blockedUserId: string) {
        const block = await prisma.blockedUser.findFirst({
            where: {
                blockerUserId,
                blockedUserId,
            },
        });

        if (!block) {
            throw new Error('Block not found');
        }

        await prisma.blockedUser.delete({
            where: {
                id: block.id,
            },
        });

        logger.info('User unblocked successfully', {
            blockerUserId,
            blockedUserId,
        });

        return {
            message: 'User unblocked successfully',
        };
    }

    /**
     * Get list of blocked users with profile info
     */
    async getBlockedUsers(userId: string) {
        const blocks = await prisma.blockedUser.findMany({
            where: {
                blockerUserId: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Fetch profile info for blocked users
        const blockedUserIds = blocks.map((b) => b.blockedUserId);
        const profiles = await prisma.profile.findMany({
            where: {
                userId: {
                    in: blockedUserIds,
                },
            },
            select: {
                id: true,
                userId: true,
                displayName: true,
                headline: true,
                gender: true,
                location: true,
                photos: {
                    where: {
                        deletedAt: null,
                    },
                    select: {
                        url: true,
                    },
                    take: 1,
                },
            },
        });

        // Map blocks with profile data
        const blockedUsersWithProfiles = blocks.map((block) => {
            const profile = profiles.find((p) => p.userId === block.blockedUserId);
            return {
                blockId: block.id,
                blockedUserId: block.blockedUserId,
                reason: block.reason,
                blockedAt: block.createdAt,
                profile: profile
                    ? {
                        profileId: profile.id,
                        displayName: profile.displayName,
                        headline: profile.headline,
                        gender: profile.gender,
                        location: profile.location,
                        photoUrl: profile.photos[0]?.url || null,
                    }
                    : null,
            };
        });

        return blockedUsersWithProfiles;
    }

    /**
     * Check if user1 has blocked user2 or vice versa
     */
    async isBlocked(userId1: string, userId2: string): Promise<boolean> {
        const block = await prisma.blockedUser.findFirst({
            where: {
                OR: [
                    { blockerUserId: userId1, blockedUserId: userId2 },
                    { blockerUserId: userId2, blockedUserId: userId1 },
                ],
            },
        });

        return !!block;
    }
}

export const blockService = new BlockService();
