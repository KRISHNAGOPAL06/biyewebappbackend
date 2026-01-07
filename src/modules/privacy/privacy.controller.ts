import { Request, Response, NextFunction } from 'express';
import { privacyService } from './privacy.service.js';
import { UpdatePhotoPrivacyDTO } from './privacy.dto.js';
import { logger } from '../../utils/logger.js';

export class PrivacyController {
    async updatePhotoPrivacy(req: Request, res: Response, next: NextFunction) {
        try {
            const dto: UpdatePhotoPrivacyDTO = req.body;
            const userId = req.userId;

            console.log('DEBUG: updatePhotoPrivacy called', { userId, dto });

            if (!userId) {
                console.log('DEBUG: userId missing');
                return res.status(401).json({
                    success: false,
                    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
                });
            }

            logger.info('Update photo privacy request', {
                userId,
                privacyLevel: dto.privacyLevel,
            });

            const result = await privacyService.updatePhotoPrivacy(userId, dto);
            console.log('DEBUG: updatePhotoPrivacy success', result);

            res.status(200).json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('DEBUG: updatePhotoPrivacy error', error);
            logger.error('Error updating photo privacy', { error: error.message });
            next(error);
        }
    }

    async getPrivacySettings(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
                });
            }

            logger.info('Get privacy settings request', { userId });

            const settings = await privacyService.getPrivacySettings(userId);

            res.status(200).json({
                success: true,
                data: settings,
            });
        } catch (error: any) {
            logger.error('Error getting privacy settings', { error: error.message });
            next(error);
        }
    }
}

export const privacyController = new PrivacyController();
