import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

export class InterestRateLimitService {
  private readonly MAX_INTERESTS_PER_DAY = 20;

  private getRateLimitKey(userId: string): string {
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    return `ratelimit:interest:${userId}:${today}`;
  }

  async checkRateLimit(userId: string): Promise<boolean> {
    try {
      const key = this.getRateLimitKey(userId);
      const count = await redis.get(key);
      
      const currentCount = count ? parseInt(count, 10) : 0;
      
      if (currentCount >= this.MAX_INTERESTS_PER_DAY) {
        logger.warn('Interest rate limit exceeded', { userId, count: currentCount });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('Rate limit check error', { userId, error });
      return true;
    }
  }

  async incrementRateLimit(userId: string): Promise<void> {
    try {
      const key = this.getRateLimitKey(userId);
      const count = await redis.incr(key);
      
      if (count === 1) {
        await redis.expire(key, 86400);
      }
      
      logger.info('Interest rate limit incremented', { userId, count });
    } catch (error) {
      logger.error('Rate limit increment error', { userId, error });
    }
  }

  async getRemainingCount(userId: string): Promise<number> {
    try {
      const key = this.getRateLimitKey(userId);
      const count = await redis.get(key);
      const currentCount = count ? parseInt(count, 10) : 0;
      return Math.max(0, this.MAX_INTERESTS_PER_DAY - currentCount);
    } catch (error) {
      logger.error('Get remaining count error', { userId, error });
      return this.MAX_INTERESTS_PER_DAY;
    }
  }
}

export const interestRateLimitService = new InterestRateLimitService();
