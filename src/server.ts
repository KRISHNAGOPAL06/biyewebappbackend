import { httpServer } from './index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import './modules/notifications/notification.dispatcher.js';


const PORT = env.PORT;

// const server = app.listen(PORT, () => {
//   logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
//   logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);
// });

const server = httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});
