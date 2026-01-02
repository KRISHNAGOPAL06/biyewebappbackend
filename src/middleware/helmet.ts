import helmet from 'helmet';

export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://accounts.google.com', 'https://*.firebaseapp.com'],
      connectSrc: ["'self'", 'https:', 'wss:', 'http:', 'ws:', 'https://accounts.google.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      frameSrc: ["'self'", 'https://accounts.google.com', 'https://*.firebaseapp.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
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
