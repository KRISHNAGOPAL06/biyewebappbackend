import cors from 'cors';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // 🔥 ALWAYS allow payment callbacks & webhooks
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = (env.ALLOWED_ORIGINS ?? []).map((o) => o.replace(/\/+$/, '').toLowerCase());
    const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();

    // Generic Dev Fallback: Allow common frontend ports and local IPs
    if (
      normalizedOrigin.startsWith('http://localhost:') ||
      normalizedOrigin.startsWith('http://127.0.0.1:') ||
      normalizedOrigin.startsWith('http://192.168.') ||
      normalizedOrigin.startsWith('http://10.0.2.2:')
    ) {
      logger.info(`[CORS] Allowed dev origin: ${origin}`);
      return callback(null, true);
    }

    // Check for exact match or wildcard match (e.g. if ALLOWED_ORIGINS has "http://localhost:5173/*")
    const isAllowed = allowedOrigins.some((o) => {
      if (o.endsWith('/*')) {
        const base = o.slice(0, -2);
        return normalizedOrigin.startsWith(base);
      }
      return o === normalizedOrigin;
    });

    if (isAllowed) {
      logger.info(`[CORS] Allowed origin: ${origin}`);
      return callback(null, true);
    }

    logger.warn(`[CORS] Access denied for origin: ${origin}. Allowed origins are: ${allowedOrigins.join(', ')}`);
    // ❌ DO NOT throw — just deny silently
    return callback(null, false);
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-Id',
    'Idempotency-Key',
    'X-CSRF-Token',
  ],

  exposedHeaders: ['X-Request-Id'],
});
