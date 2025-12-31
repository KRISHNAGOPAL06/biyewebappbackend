import { Request, Response, NextFunction } from 'express';
import { discoveryService } from './discovery.service.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export class DiscoveryController {
  async getRecommended(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      logger.info('Fetching recommended profiles', {
        userId,
        cursor,
        limit,
        requestId: req.requestId,
      });

      const result = await discoveryService.getRecommended(userId, cursor, limit);
      console.log(result)


      return sendSuccess(res, result, 'Recommended profiles retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getNewToday(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      logger.info('Fetching new profiles', {
        userId,
        cursor,
        limit,
        requestId: req.requestId,
      });

      const result = await discoveryService.getNewToday(userId, cursor, limit);

      return sendSuccess(res, result, 'New profiles retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getNearby(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const cursor = req.query.cursor as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      logger.info('Fetching nearby profiles', {
        userId,
        cursor,
        limit,
        requestId: req.requestId,
      });

      const result = await discoveryService.getNearby(userId, cursor, limit);

      return sendSuccess(res, result, 'Nearby profiles retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const discoveryController = new DiscoveryController();
