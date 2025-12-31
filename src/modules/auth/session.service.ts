import { SessionInfo } from './auth.types.js';
import { logger } from '../../utils/logger.js';

import { prisma } from '../../prisma.js';

export class SessionService {
  async createSession(userId: string, sessionInfo: SessionInfo): Promise<string> {
    const session = await prisma.session.create({
      data: {
        userId,
        deviceId: sessionInfo.deviceId,
        ip: sessionInfo.ip,
        userAgent: sessionInfo.userAgent,
        revoked: false,
      },
    });

    logger.info('Session created', { userId, sessionId: session.id });

    return session.id;
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await prisma.session.update({
      where: { id: sessionId },
      data: { revoked: true },
    });

    logger.info('Session revoked', { sessionId });
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    });

    logger.info('All user sessions revoked', { userId });
  }

  async getActiveSessions(userId: string) {
    return prisma.session.findMany({
      where: { userId, revoked: false },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    return session !== null && !session.revoked;
  }

  async getSessionById(sessionId: string) {
    return prisma.session.findUnique({
      where: { id: sessionId },
    });
  }
}

export const sessionService = new SessionService();
