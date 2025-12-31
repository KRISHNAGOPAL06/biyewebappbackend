import cors from 'cors';
import { env } from '../config/env.js';

// const allowedOrigins: string[] = env.ALLOWED_ORIGINS ?? [];

// export const corsMiddleware = cors({
//   origin: (origin, callback) => {
//     // Allow server-to-server & same-origin
//     if (!origin) return callback(null, true);

//     // Allow whitelisted origins
//     if (allowedOrigins.includes(origin)) {
//       return callback(null, true);
//     }

//     // Explicitly block others
//     return callback(new Error('CORS not allowed'), false);
//   },

//   credentials: true,

//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

//   allowedHeaders: [
//     'Content-Type',
//     'Authorization',
//     'X-Request-Id',
//     'Idempotency-Key',
//   ],

//   exposedHeaders: ['X-Request-Id'],

//   maxAge: 86400,
// });
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // 🔥 ALWAYS allow payment callbacks & webhooks
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = (env.ALLOWED_ORIGINS ?? []).map((o) => o.replace(/\/+$/, '').toLowerCase());
    const normalizedOrigin = origin.replace(/\/+$/, '').toLowerCase();

    // Check for exact match or wildcard match (e.g. if ALLOWED_ORIGINS has "http://localhost:5173/*")
    const isAllowed = allowedOrigins.some((o) => {
      if (o.endsWith('/*')) {
        const base = o.slice(0, -2);
        return normalizedOrigin.startsWith(base);
      }
      return o === normalizedOrigin;
    });

    if (isAllowed) {
      return callback(null, true);
    }

    
    // DO NOT throw — just deny silently
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
