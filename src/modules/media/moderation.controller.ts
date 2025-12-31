import { Request, Response, NextFunction } from 'express';
import { moderationService } from './moderation.service.js';
import { ModerationCallbackDTO } from './upload.dto.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export class ModerationController {
  async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const moderationSecret = req.headers['x-moderation-secret'] as string;

      if (!moderationSecret) {
        logger.warn('Moderation callback without secret', {
          ip: req.ip,
          requestId: req.requestId,
        });
        return sendError(res, 'Missing X-Moderation-Secret header', 401, 'UNAUTHORIZED');
      }

      const isValidSecret = moderationService.validateModerationSecret(moderationSecret);

      if (!isValidSecret) {
        logger.warn('Moderation callback with invalid secret', {
          ip: req.ip,
          requestId: req.requestId,
        });
        return sendError(res, 'Invalid moderation secret', 403, 'FORBIDDEN');
      }

      const dto: ModerationCallbackDTO = req.body;

      logger.info('Processing moderation callback', {
        objectKey: dto.objectKey,
        status: dto.status,
        requestId: req.requestId,
      });

      await moderationService.handleModerationCallback(dto);

      return sendSuccess(res, { success: true }, 'Moderation callback processed', 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const moderationController = new ModerationController();
