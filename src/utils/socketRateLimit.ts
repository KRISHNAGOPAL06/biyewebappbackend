import { logger } from './logger.js';

interface RateLimitConfig {
  maxTokens: number;
  refillRate: number;
  refillInterval: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

const defaultConfig: RateLimitConfig = {
  maxTokens: 10,
  refillRate: 10,
  refillInterval: 10000,
};

export class SocketRateLimiter {
  private config: RateLimitConfig;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  consume(socketId: string): boolean {
    const now = Date.now();
    let bucket = buckets.get(socketId);

    if (!bucket) {
      bucket = {
        tokens: this.config.maxTokens - 1,
        lastRefill: now,
      };
      buckets.set(socketId, bucket);
      return true;
    }

    const timePassed = now - bucket.lastRefill;
    const refillIntervals = Math.floor(timePassed / this.config.refillInterval);

    if (refillIntervals > 0) {
      bucket.tokens = Math.min(
        this.config.maxTokens,
        bucket.tokens + refillIntervals * this.config.refillRate
      );
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    logger.warn(`Rate limit exceeded for socket: ${socketId}`);
    return false;
  }

  cleanup(socketId: string): void {
    buckets.delete(socketId);
  }

  static cleanupOld(maxAge: number = 3600000): void {
    const now = Date.now();
    for (const [socketId, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > maxAge) {
        buckets.delete(socketId);
      }
    }
  }
}

export const createSocketRateLimiter = (config?: Partial<RateLimitConfig>) => {
  return new SocketRateLimiter(config);
};

setInterval(() => {
  SocketRateLimiter.cleanupOld();
}, 600000);
