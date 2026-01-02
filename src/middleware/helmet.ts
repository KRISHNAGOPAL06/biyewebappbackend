import helmet from 'helmet';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://accounts.google.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'http:', 'blob:'],
      connectSrc: ["'self'", 'https:', 'http:', 'wss:', 'ws:', 'https://accounts.google.com'],
      frameSrc: ["'self'", 'https://accounts.google.com'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  noSniff: true,
  xssFilter: true,
});
