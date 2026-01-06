import { Request, Response } from 'express';
import { prisma } from '../../prisma.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { favoritesService } from './favorites.service.js';
import { logger } from '../../utils/logger.js';

export class FavoritesController {
    async addToFavorites(req: Request, res: Response) {
        try {
            const userId = req.userId;
            const { profileId } = req.body;

            if (!profileId) {
                return sendError(res, 'Profile ID is required', 400);
            }

            // Resolve profileId to userId
            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                select: { userId: true },
            });

            if (!profile) {
                return sendError(res, 'Profile not found', 404);
            }

            const result = await favoritesService.addToFavorites(userId!, profile.userId);
            sendSuccess(res, result, 'Added to favorites');
        } catch (error: any) {
            logger.error('Error adding to favorites', error);
            sendError(res, error.message, 500);
        }
    }

    async getFavorites(req: Request, res: Response) {
        try {
            const userId = req.userId;

            const requester = {
                userId: userId!,
                isOwner: false, // context
                isPremium: false,
                isGuardian: false
            };

            const result = await favoritesService.getFavorites(requester);
            // Wrap in { data: result } because existing codebase seems to standardise on that
            // sendSuccess wraps in { success: true, data: result, ... }
            sendSuccess(res, result, 'Favorites retrieved');
        } catch (error: any) {
            logger.error('Error getting favorites', error);
            sendError(res, error.message, 500);
        }
    }

    async removeFavorite(req: Request, res: Response) {
        try {
            const userId = req.userId;
            const { id } = req.params; // profileId or interestId?
            // Frontend favoriteApi.removeFavorite passes profileId in URL: DELETE /favorites/:profileId

            const profileId = id;

            // Resolve profileId to userId
            const profile = await prisma.profile.findUnique({
                where: { id: profileId },
                select: { userId: true },
            });

            if (!profile) {
                return sendError(res, 'Profile not found', 404);
            }

            await favoritesService.removeFavorite(userId!, profile.userId);
            sendSuccess(res, null, 'Removed from favorites');
        } catch (error: any) {
            logger.error('Error removing favorite', error);
            sendError(res, error.message, 500);
        }
    }
}

export const favoritesController = new FavoritesController();
