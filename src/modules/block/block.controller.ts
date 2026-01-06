import { Request, Response, NextFunction } from 'express';
import { blockService } from './block.service.js';
import { BlockUserDTO } from './block.dto.js';
import { logger } from '../../utils/logger.js';

export class BlockController {
    async blockUser(req: Request, res: Response, next: NextFunction) {
        try {
            const dto: BlockUserDTO = req.body;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
                });
            }

            logger.info('Block user request', {
                userId,
                blockedUserId: dto.blockedUserId,
            });

            const result = await blockService.blockUser(userId, dto);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            logger.error('Error blocking user', { error: error.message });
            next(error);
        }
    }

    async unblockUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { blockedUserId } = req.params;
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
                });
            }

            logger.info('Unblock user request', {
                userId,
                blockedUserId,
            });

            const result = await blockService.unblockUser(userId, blockedUserId);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            logger.error('Error unblocking user', { error: error.message });
            next(error);
        }
    }

    async getBlockedUsers(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
                });
            }

            logger.info('Get blocked users request', { userId });

            const blockedUsers = await blockService.getBlockedUsers(userId);

            res.status(200).json({
                success: true,
                data: blockedUsers,
            });
        } catch (error: any) {
            logger.error('Error getting blocked users', { error: error.message });
            next(error);
        }
    }
}

export const blockController = new BlockController();
