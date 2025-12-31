import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../modules/auth/token.service.js';
import { sessionService } from '../modules/auth/session.service.js';
import { JWTPayload } from '../modules/auth/auth.types.js';
import { sendError } from '../utils/response.js';
import { logger } from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      sessionId?: string;
      email?: string;
    }
  }
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'No token provided', 401, 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload: JWTPayload = await tokenService.verifyAccessToken(token);

    const isSessionValid = await sessionService.isSessionValid(payload.sessionId);

    if (!isSessionValid) {
      sendError(res, 'Session has been revoked', 401, 'SESSION_REVOKED');
      return;
    }

    req.userId = payload.userId;
    req.sessionId = payload.sessionId;
    req.email = payload.email;

    await sessionService.updateSessionActivity(payload.sessionId);

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

    logger.warn('Authentication failed', {
      error: errorMessage,
      ip: req.ip,
      path: req.path,
    });

    if (errorMessage.includes('expired')) {
      sendError(res, 'Access token expired', 401, 'TOKEN_EXPIRED');
      return;
    }

    if (errorMessage.includes('Invalid')) {
      sendError(res, 'Invalid access token', 401, 'INVALID_TOKEN');
      return;
    }

    sendError(res, 'Authentication failed', 401, 'UNAUTHORIZED');
  }
}

export async function optionalAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload: JWTPayload = await tokenService.verifyAccessToken(token);

    const isSessionValid = await sessionService.isSessionValid(payload.sessionId);

    if (isSessionValid) {
      req.userId = payload.userId;
      req.sessionId = payload.sessionId;
      req.email = payload.email;
    }
  } catch (error) {
    logger.debug('Optional auth failed', { error });
  }

  next();
}
