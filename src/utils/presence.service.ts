import { logger } from './logger.js';

interface UserPresence {
  userId: string;
  socketIds: Set<string>;
  lastSeen: Date;
  status: 'online' | 'offline';
}

const presenceMap = new Map<string, UserPresence>();

export class PresenceService {
  markOnline(userId: string, socketId: string): void {
    let presence = presenceMap.get(userId);

    if (!presence) {
      presence = {
        userId,
        socketIds: new Set([socketId]),
        lastSeen: new Date(),
        status: 'online',
      };
      presenceMap.set(userId, presence);
    } else {
      presence.socketIds.add(socketId);
      presence.status = 'online';
      presence.lastSeen = new Date();
    }

    logger.info(`User ${userId} marked online with socket ${socketId}`);
  }

  markOffline(userId: string, socketId: string): void {
    const presence = presenceMap.get(userId);

    if (presence) {
      presence.socketIds.delete(socketId);
      presence.lastSeen = new Date();

      if (presence.socketIds.size === 0) {
        presence.status = 'offline';
        logger.info(`User ${userId} marked offline`);
      } else {
        logger.info(`Socket ${socketId} disconnected but user ${userId} still has ${presence.socketIds.size} active connection(s)`);
      }
    }
  }

  isOnline(userId: string): boolean {
    const presence = presenceMap.get(userId);
    return presence ? presence.status === 'online' && presence.socketIds.size > 0 : false;
  }

  getSocketIds(userId: string): string[] {
    const presence = presenceMap.get(userId);
    return presence ? Array.from(presence.socketIds) : [];
  }

  getOnlineUsers(): string[] {
    return Array.from(presenceMap.entries())
      .filter(([, presence]) => presence.status === 'online' && presence.socketIds.size > 0)
      .map(([userId]) => userId);
  }

  cleanup(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [userId, presence] of presenceMap.entries()) {
      if (
        presence.status === 'offline' &&
        now - presence.lastSeen.getTime() > maxAge
      ) {
        presenceMap.delete(userId);
        logger.debug(`Cleaned up stale presence for user ${userId}`);
      }
    }
  }
}

export const presenceService = new PresenceService();

setInterval(() => {
  presenceService.cleanup();
}, 600000);
