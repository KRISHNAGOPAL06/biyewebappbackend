import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';
import { ZodError } from 'zod';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error occurred', {
    requestId: req.requestId,
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err instanceof ZodError) {
    sendError(
      res,
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      err.errors
    );
    return;
  }

  if (err.name === 'UnauthorizedError') {
    sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
    return;
  }

  if (err.message === 'Not allowed by CORS') {
    sendError(res, 'CORS policy violation', 403, 'CORS_ERROR');
    return;
  }

  if (err.message.includes('This account uses Google Login')) {
    sendError(res, err.message, 400, 'GOOGLE_AUTH_ERROR');
    return;
  }

  sendError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
    500,
    'INTERNAL_SERVER_ERROR'
  );
}
