import winston from 'winston';
import { env } from '../config/env.js';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'biye-api' },
  transports: [
    new winston.transports.Console({
      format: env.NODE_ENV === 'production'
        ? logFormat
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
    }),
  ],
});

export function logRequest(requestId: string, method: string, path: string, statusCode?: number, duration?: number) {
  const logData: Record<string, any> = {
    requestId,
    method,
    path,
  };

  if (statusCode !== undefined) {
    logData.statusCode = statusCode;
  }

  if (duration !== undefined) {
    logData.duration = `${duration}ms`;
  }

  logger.info('HTTP Request', logData);
}
