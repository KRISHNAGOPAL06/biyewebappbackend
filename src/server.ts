import { httpServer } from './index.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import './modules/notifications/notification.dispatcher.js';
import { seedPlans } from './modules/payments/plan.seed.js';


const PORT = env.PORT;

// const server = app.listen(PORT, () => {
//   logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
//   logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);
// });

const server = httpServer.listen(PORT, '0.0.0.0', async () => {
  logger.info(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  logger.info(`📡 Health check: http://localhost:${PORT}/api/health`);

  // Seed plans on startup
  try {
    await seedPlans();
    logger.info('✅ Plans verification completed');

    // Log environment configuration for debugging
    const { env } = await import('./config/env.js');
    logger.info(`🌐 Configuration: FRONTEND_URL=${env.FRONTEND_URL}`);
    logger.info(`📡 Configuration: APP_BASE_URL=${env.APP_BASE_URL}`);

  } catch (error) {
    logger.error('❌ Startup initialization failed:', error);
  }
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
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  console.error('CRITICAL: Uncaught Exception:', error.message);
  console.error(error.stack);
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});
