import express, { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { helmetMiddleware } from './middleware/helmet.js';
import { corsMiddleware } from './middleware/cors.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logRequest } from './utils/logger.js';
import healthRoute from './routes/health.route.js';
import authRoutes from './modules/auth/auth.routes.js';
import profileRoutes from './modules/profile/profile.routes.js';
import mediaRoutes from './modules/media/media.routes.js';
import moderationRoutes from './modules/media/moderation.routes.js';
import profilePhotosRoutes from './modules/profile/profile.photos.routes.js';
import discoveryRoutes from './modules/discovery/discovery.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import connectionsRoutes from './modules/connections/connections.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import paymentRoutes from './modules/payments/payment.routes.js';
import invitationRoutes from './modules/payments/invitation.routes.js';
import path from 'path';
// import { Server } from 'socket.io';
import { Server as SocketIOServer } from 'socket.io';

import { createServer } from 'http';
import { attachChat } from './modules/chat/chat.gateway.js';
import { attachSubscriptionGateway } from './modules/payments/subscription.gateway.js';
import vendorRoutes from './modules/vendor/index.js';
import reportRoutes from './modules/report/report.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import obhijaatRoutes from './modules/obhijaat/obhijaat.routes.js';

export function createApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(requestIdMiddleware);

  // const io = new Server(httpServer, {
  //   cors: {
  //     origin: "*",
  //   },
  // });

  // Create HTTP server (if not already created)
  // const httpServer = createServer(app);

  // Initialize Socket.IO
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
  });

  // Attach gateways
  attachChat(io);
  attachSubscriptionGateway(io);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logRequest(req.requestId, req.method, req.path, res.statusCode, duration);
    });

    next();
  });

  app.set('trust proxy', true);

  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'uploads'), {
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Access-Control-Allow-Origin', '*');
      },
    })
  );

  app.use(rateLimiter);

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  app.use('/api/health', healthRoute);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/profiles', profileRoutes);
  app.use('/api/v1/profiles', profilePhotosRoutes);
  app.use('/api/v1/media', mediaRoutes);
  app.use('/api/v1/media/moderation', moderationRoutes);
  app.use('/api/v1/discovery', discoveryRoutes);
  app.use('/api/v1/search', searchRoutes);
  app.use('/api/v1/connections', connectionsRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/payments', paymentRoutes);
  app.use('/api/v1/invitations', invitationRoutes);
  app.use('/api/v1/chats', chatRoutes);
  app.use('/api/v1/payments/callback', paymentRoutes);
  app.use('/api/v1/payments/webhooks', paymentRoutes);
  app.use('/api/v1/vendor', vendorRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/obhijaat', obhijaatRoutes);
  app.use('/api/v1/reports', reportRoutes);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        code: 'NOT_FOUND',
      },
    });
  });

  app.use(errorHandler);

  return { app, httpServer };
}

export const { app, httpServer } = createApp();
