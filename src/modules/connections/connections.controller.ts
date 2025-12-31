import { Request, Response, NextFunction } from 'express';
import { connectionsService } from './connections.service.js';
import {
  SendInterestDTO,
  AcceptInterestDTO,
  DeclineInterestDTO,
  WithdrawInterestDTO,
} from './connections.dto.js';
import { idempotencyService } from './idempotency.service.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

import { prisma } from '../../prisma.js';

export class ConnectionsController {
  async sendInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const dto: SendInterestDTO = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const effectiveUserId = await this.resolveCandidateUserId(userId);

      logger.info('Send interest request', {
        userId,
        effectiveUserId,
        toUserId: dto.toUserId,
        idempotencyKey,
        requestId: req.requestId,
      });

      if (idempotencyKey) {
        const idempotencyCheck = await idempotencyService.checkIdempotency(idempotencyKey);
        if (idempotencyCheck.isReplay) {
          logger.info('Returning cached response for idempotent request', { idempotencyKey });
          return res.status(200).json(idempotencyCheck.cachedResponse);
        }
      }

      const result = await connectionsService.sendInterest(effectiveUserId, dto);

      const response = {
        success: true,
        data: result,
        message: 'Interest sent successfully',
      };

      if (idempotencyKey) {
        await idempotencyService.storeResponse(idempotencyKey, response);
      }

      return sendSuccess(res, result, 'Interest sent successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async acceptInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const dto: AcceptInterestDTO = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const effectiveUserId = await this.resolveCandidateUserId(userId);

      logger.info('Accept interest request', {
        userId,
        effectiveUserId,
        fromUserId: dto.fromUserId,
        idempotencyKey,
        requestId: req.requestId,
      });

      if (idempotencyKey) {
        const idempotencyCheck = await idempotencyService.checkIdempotency(idempotencyKey);
        if (idempotencyCheck.isReplay) {
          logger.info('Returning cached response for idempotent request', { idempotencyKey });
          return res.status(200).json(idempotencyCheck.cachedResponse);
        }
      }

      const result = await connectionsService.acceptInterest(effectiveUserId, dto);

      const response = {
        success: true,
        data: result,
        message: 'Interest accepted successfully',
      };

      if (idempotencyKey) {
        await idempotencyService.storeResponse(idempotencyKey, response);
      }

      return sendSuccess(res, result, 'Interest accepted successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async declineInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const dto: DeclineInterestDTO = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const effectiveUserId = await this.resolveCandidateUserId(userId);

      logger.info('Decline interest request', {
        userId,
        effectiveUserId,
        fromUserId: dto.fromUserId,
        idempotencyKey,
        requestId: req.requestId,
      });

      if (idempotencyKey) {
        const idempotencyCheck = await idempotencyService.checkIdempotency(idempotencyKey);
        if (idempotencyCheck.isReplay) {
          logger.info('Returning cached response for idempotent request', { idempotencyKey });
          return res.status(200).json(idempotencyCheck.cachedResponse);
        }
      }

      const result = await connectionsService.declineInterest(effectiveUserId, dto);

      const response = {
        success: true,
        data: result,
        message: 'Interest declined',
      };

      if (idempotencyKey) {
        await idempotencyService.storeResponse(idempotencyKey, response);
      }

      return sendSuccess(res, result, 'Interest declined', 200);
    } catch (error) {
      return next(error);
    }
  }

  async withdrawInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const dto: WithdrawInterestDTO = req.body;
      const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

      const effectiveUserId = await this.resolveCandidateUserId(userId);

      logger.info('Withdraw interest request', {
        userId,
        effectiveUserId,
        toUserId: dto.toUserId,
        idempotencyKey,
        requestId: req.requestId,
      });

      if (idempotencyKey) {
        const idempotencyCheck = await idempotencyService.checkIdempotency(idempotencyKey);
        if (idempotencyCheck.isReplay) {
          logger.info('Returning cached response for idempotent request', { idempotencyKey });
          return res.status(200).json(idempotencyCheck.cachedResponse);
        }
      }

      const result = await connectionsService.withdrawInterest(effectiveUserId, dto);

      const response = {
        success: true,
        data: result,
        message: 'Interest withdrawn',
      };

      if (idempotencyKey) {
        await idempotencyService.storeResponse(idempotencyKey, response);
      }

      return sendSuccess(res, result, 'Interest withdrawn', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getSentInterests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      let effectiveUserId = { userId: await this.resolveCandidateUserId(userId) };
      // effectiveUserId={userId:effectiveUserId};


      logger.info('Get sent interests request', {
        userId,
        effectiveUserId,
        requestId: req.requestId,
      });

      const interests = await connectionsService.getSentInterests(effectiveUserId);

      return sendSuccess(res, interests, 'Sent interests retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getReceivedInterests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      // const effectiveUserId = await this.resolveCandidateUserId(userId);
      let effectiveUserId = { userId: await this.resolveCandidateUserId(userId) };


      logger.info('Get received interests request', {
        userId,
        effectiveUserId,
        requestId: req.requestId,
      });

      const interests = await connectionsService.getReceivedInterests(effectiveUserId);

      return sendSuccess(res, interests, 'Received interests retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      // const effectiveUserId = await this.resolveCandidateUserId(userId);
      let effectiveUserId = { userId: await this.resolveCandidateUserId(userId) };


      logger.info('Get matches request', {
        userId,
        effectiveUserId,
        requestId: req.requestId,
      });

      const matches = await connectionsService.getMatches(effectiveUserId);

      return sendSuccess(res, matches, 'Matches retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Same logic as in other parts of your code:
   * - self/candidate → act as themselves
   * - parent        → act as the linked candidate (via CandidateLink.profile.userId)
   */
  private async resolveCandidateUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('user not found');
    }

    if (user.role === 'self' || user.role === 'candidate') {
      return userId;
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

      const linkedProfileUserId = link?.profile.userId;

      if (!linkedProfileUserId) {
        throw new Error('No active candidate profile linked to this parent');
      }

      return linkedProfileUserId;
    }
    if (user.role === 'guardian') {
      const link = await prisma.candidateLink.findFirst({
        where: {
          childUserId: userId,
          status: 'active',
        },
        include: { profile: true },
      });

      const linkedProfileUserId = link?.profile.userId;

      if (!linkedProfileUserId) {
        throw new Error('No active candidate profile linked to this parent');
      }

      return linkedProfileUserId;
    }

    // Other roles (if any) just act as themselves for now
    return userId;
  }
}

export const connectionsController = new ConnectionsController();
