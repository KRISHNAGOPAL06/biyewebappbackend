import { Server } from 'socket.io';
import { logger } from '../../utils/logger.js';
import { presenceService } from '../../utils/presence.service.js';
import { SocketRateLimiter } from '../../utils/socketRateLimit.js';
import { chatService } from './chat.service.js';
import { tokenService } from '../auth/token.service.js';
import { sessionService } from '../auth/session.service.js';
import {
  PrivateMessagePayload,
  ChatServer,
} from './chat.types.js';

const rateLimiter = new SocketRateLimiter({
  maxTokens: 10,
  refillRate: 10,
  refillInterval: 60000,
});

export function attachChat(io: Server): void {
  chatService.setSocketServer(io as ChatServer);

  io.use(async (socket: any, next: (err?: Error) => void) => {
    try {
      const token = socket.handshake?.auth?.token;

      if (!token) {
        logger.warn('Socket connection attempt without token');
        return next(new Error('Authentication token required'));
      }

      const payload = await tokenService.verifyAccessToken(token);

      const isSessionValid = await sessionService.isSessionValid(payload.sessionId);

      if (!isSessionValid) {
        logger.warn(`Socket connection with revoked session: ${payload.sessionId}`);
        return next(new Error('Session has been revoked'));
      }

      socket.data = {
        userId: payload.userId,
        sessionId: payload.sessionId,
      };

      logger.debug(`Socket authenticated for user ID ending in ${payload.userId.slice(-6)}`);
      next();
    } catch (error: any) {
      logger.warn('Socket authentication failed', { error: error.message });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: any) => {
    const userId = socket.data.userId;

    socket.join(`user:${userId}`);
    presenceService.markOnline(userId, socket.id);
    io.emit('user_online', { userId });

    logger.info(`User ${userId} connected with socket ${socket.id}`);

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('private_message', async (payload: PrivateMessagePayload) => {
      try {
        if (!rateLimiter.consume(socket.id)) {
          socket.emit('rate_limited');
          logger.warn(`Rate limit exceeded for socket ${socket.id}, user ${userId}`);
          return;
        }

        const { threadId, toUserId, content, metadata } = payload;

        if (!content || content.trim().length === 0) {
          socket.emit('error', { message: 'Message content is required', code: 'EMPTY_CONTENT' });
          return;
        }

        if (!toUserId && !threadId) {
          socket.emit('error', { message: 'toUserId or threadId is required', code: 'MISSING_RECIPIENT' });
          return;
        }

        if (threadId) {
          const thread = await chatService.getThread(threadId, userId);
          if (!thread) {
            socket.emit('error', { message: 'Thread not found or access denied', code: 'THREAD_NOT_FOUND' });
            return;
          }
        } else if (toUserId) {
          const canChat = await chatService.canUserChat(userId, toUserId);
          if (!canChat) {
            socket.emit('error', { message: 'Cannot create chat. Mutual match required.', code: 'NOT_ALLOWED' });
            return;
          }
        }

        const message = await chatService.saveMessage({
          threadId,
          fromUserId: userId,
          toUserId: toUserId,
          content,
          metadata,
        });

        socket.emit('message', message);

        logger.info(`Message sent from ${userId} to ${toUserId} in thread ${message.threadId}`);
      } catch (error: any) {
        logger.error('Error handling private_message:', error);
        socket.emit('error', { message: error.message || 'Failed to send message', code: 'MESSAGE_FAILED' });
      }
    });

    socket.on('disconnect', () => {
      presenceService.markOffline(userId, socket.id);
      if (!presenceService.isOnline(userId)) {
        io.emit('user_offline', { userId });
      }
      rateLimiter.cleanup(socket.id);
      logger.info(`User ${userId} disconnected, socket ${socket.id}`);
    });

    socket.on('error', (error: any) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  logger.info('Chat gateway attached to Socket.IO server');
}
