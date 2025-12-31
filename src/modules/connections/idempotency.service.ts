import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';

export interface IdempotencyResult {
  isReplay: boolean;
  cachedResponse?: any;
}

export class IdempotencyService {
  private readonly TTL_SECONDS = 600;

  private getIdempotencyKey(key: string): string {
    return `idempotency:${key}`;
  }

  async checkIdempotency(idempotencyKey: string): Promise<IdempotencyResult> {
    try {
      const key = this.getIdempotencyKey(idempotencyKey);
      const cached = await redis.get(key);
      
      if (cached) {
        const cachedResponse = JSON.parse(cached);
        logger.info('Idempotent request detected, returning cached response', {
          idempotencyKey,
        });
        return {
          isReplay: true,
          cachedResponse,
        };
      }
      
      return {
        isReplay: false,
      };
    } catch (error) {
      logger.error('Idempotency check error', { idempotencyKey, error });
      return {
        isReplay: false,
      };
    }
  }

  async storeResponse(idempotencyKey: string, response: any): Promise<void> {
    try {
      const key = this.getIdempotencyKey(idempotencyKey);
      await redis.setex(key, this.TTL_SECONDS, JSON.stringify(response));
      
      logger.info('Response stored for idempotency', {
        idempotencyKey,
        ttl: this.TTL_SECONDS,
      });
    } catch (error) {
      logger.error('Idempotency store error', { idempotencyKey, error });
    }
  }
}

export const idempotencyService = new IdempotencyService();
