import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';
import { profilePermissions } from '../profile/profile.permissions.js';
import { RequesterContext } from '../profile/profile.types.js';

export class FavoritesService {
    async addToFavorites(userId: string, targetUserId: string) {
        if (userId === targetUserId) {
            throw new Error('Cannot favorite yourself');
        }

        const existing = await prisma.interest.findUnique({
            where: {
                fromUserId_toUserId: {
                    fromUserId: userId,
                    toUserId: targetUserId,
                },
            },
        });

        if (existing) {
            if (existing.status === 'shortlisted') {
                return existing;
            }
            // If it exists but is not 'shortlisted', we might be overwriting a pending/accepted request?
            // Usually "Shortlisting" is a weaker signal than "Pending" interest.
            // If interest is 'pending' or 'accepted', we probably shouldn't downgrade it to 'shortlisted'?
            // BUT, user might want to shortlist someone they already liked?
            // For now, let's say if it's 'pending' or 'accepted', we throw error or return existing.
            if (['pending', 'accepted'].includes(existing.status)) {
                throw new Error(`Profile is already in your ${existing.status} list`);
            }

            // If status is 'declined' or 'withdrawn' or something else, we can update it to 'shortlisted'
            return prisma.interest.update({
                where: { id: existing.id },
                data: { status: 'shortlisted', updatedAt: new Date() },
            });
        }

        return prisma.interest.create({
            data: {
                fromUserId: userId,
                toUserId: targetUserId,
                status: 'shortlisted',
            },
        });
    }

    async getFavorites(requester: RequesterContext) {
        const favorites = await prisma.interest.findMany({
            where: {
                fromUserId: requester.userId,
                status: 'shortlisted',
            },
            include: {
                toUser: {
                    select: {
                        id: true,
                        email: true,
                        createdAt: true,
                        profile: {
                            include: {
                                photos: true,
                                preferences: true,
                                user: {
                                    select: { firstName: true, lastName: true }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Map to profile structure and mask
        const profiles = await Promise.all(favorites.map(async (fav) => {
            const profile = fav.toUser?.profile;
            if (!profile) return null;

            // We need to match the return shape expected by frontend (matches list)
            // or just return the profile data.
            // Frontend expects: { data: { data: [ { profileId, ... } ] } }

            // Let's return the profile object directly, maybe wrapped
            // Frontend code: fetchStats -> favoriteApi.getFavorites() -> res.data.data
            // It seems dashboard just counts them `list.length`.
            // But if user clicks it, they might go to a list page.

            // For Dashboard count, we just need the list.

            return {
                ...profile,
                id: profile.id, // ensure id is top level
                userId: fav.toUserId,
                // Add any other fields if needed
            };
        }));

        return profiles.filter(p => p !== null);
    }

    async removeFavorite(userId: string, targetUserId: string) {
        // Actually targetUserId typically comes as profileId from frontend?
        // Frontend favoriteApi passes profileId. 
        // BUT our table is Interest (UserId -> UserId).
        // So controller needs to resolve profileId -> userId.

        // Here we assume userId and targetUserId are passed correctly.
        const deleted = await prisma.interest.deleteMany({
            where: {
                fromUserId: userId,
                toUserId: targetUserId,
                status: 'shortlisted',
            },
        });
        return { count: deleted.count };
    }
}

export const favoritesService = new FavoritesService();
