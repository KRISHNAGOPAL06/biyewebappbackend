import { logger } from '../../utils/logger.js';

import { prisma } from '../../prisma.js';

class DeviceTokenService {
  /**
   * Save or update device token for a user
   * Upserts by token to handle re-registration
   */
  async saveDeviceToken(userId: string, token: string): Promise<any> {
    try {
      const deviceToken = await prisma.deviceToken.upsert({
        where: { token },
        create: {
          userId,
          token,
        },
        update: {
          userId, // Update userId if same token registered to different user
        },
      });

      logger.info('Device token saved', {
        userId,
        token: token.substring(0, 20) + '...',
      });

      return deviceToken;
    } catch (error) {
      logger.error('Failed to save device token', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all device tokens for a user
   */
  async getDeviceTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });

      return tokens.map((t) => t.token);
    } catch (error) {
      logger.error('Failed to retrieve device tokens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return [];
    }
  }

  /**
   * Delete device token
   */
  async deleteDeviceToken(token: string): Promise<boolean> {
    try {
      const result = await prisma.deviceToken.delete({
        where: { token },
      });

      logger.info('Device token deleted', {
        token: token.substring(0, 20) + '...',
      });

      return !!result;
    } catch (error) {
      if ((error as any).code === 'P2025') {
        // Record not found
        return true;
      }
      logger.error('Failed to delete device token', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Delete all device tokens for a user
   */
  async deleteAllDeviceTokens(userId: string): Promise<number> {
    try {
      const result = await prisma.deviceToken.deleteMany({
        where: { userId },
      });

      logger.info('All device tokens deleted for user', {
        userId,
        count: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to delete all device tokens', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }
}

export const deviceTokenService = new DeviceTokenService();
