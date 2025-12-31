import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { redis } from '../../config/redis.js';
import { logger } from '../../utils/logger.js';
import { JWTPayload, RefreshTokenData } from './auth.types.js';

const REFRESH_TOKEN_PREFIX = 'refresh_token:';

export class TokenService {
  generateAccessToken(userId: string, email: string, sessionId: string): string {
    const payload: JWTPayload = {
      userId,
      email,
      sessionId,
    };

    return jwt.sign(payload, String(env.JWT_SECRET), {
      expiresIn: env.JWT_ACCESS_EXPIRY,
      issuer: 'biye-api',
      audience: 'biye-client',
    } as any);
  }

  async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    const refreshToken = randomUUID();
    const tokenHash = await bcrypt.hash(refreshToken, 10);

    const tokenData: RefreshTokenData = {
      userId,
      sessionId,
      tokenHash,
      createdAt: Date.now(),
    };

    const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
    const expiryInSeconds = this.parseExpiryToSeconds(env.JWT_REFRESH_EXPIRY);

    await redis.setex(key, expiryInSeconds, JSON.stringify(tokenData));

    logger.info('Refresh token generated', { userId, sessionId });

    return refreshToken;
  }


  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET, {
        issuer: 'biye-api',
        audience: 'biye-client',
      }) as JWTPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw new Error('Token verification failed');
    }
  }

  async verifyRefreshToken(refreshToken: string): Promise<RefreshTokenData> {
    const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
    const data = await redis.get(key);

    if (!data) {
      // await this.detectTokenReuse(refreshToken);
      throw new Error('Invalid or expired refresh token');
    }

    const tokenData: RefreshTokenData = JSON.parse(data);

    const isValid = await bcrypt.compare(refreshToken, tokenData.tokenHash);
    if (!isValid) {
      throw new Error('Invalid refresh token');
    }

    return tokenData;
  }

  async rotateRefreshToken(
    oldRefreshToken: string,
    userId: string,
    sessionId: string
  ): Promise<string> {

    const newRefreshToken = await this.generateRefreshToken(userId, sessionId);

    await this.invalidateRefreshToken(oldRefreshToken);


    logger.info('Refresh token rotated', { userId, sessionId });

    return newRefreshToken;
  }

  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;
    await redis.del(key);

    logger.info('Refresh token invalidated');
  }

  async invalidateAllUserTokens(userId: string): Promise<void> {
    const pattern = `${REFRESH_TOKEN_PREFIX}*`;
    const keys = await redis.keys(pattern);

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        const tokenData: RefreshTokenData = JSON.parse(data);
        if (tokenData.userId === userId) {
          await redis.del(key);
        }
      }
    }

    logger.info('All user refresh tokens invalidated', { userId });
  }

  // Token reuse detection is currently disabled
  // private async detectTokenReuse(refreshToken: string): Promise<void> {
  //   const reuseKey = `${TOKEN_REUSE_DETECTION_PREFIX}${refreshToken}`;
  //   const reuseAttempt = await redis.get(reuseKey);
  //
  //   if (reuseAttempt) {
  //     logger.warn('Refresh token reuse detected', { refreshToken: refreshToken.substring(0, 8) });
  //     const tokenData: RefreshTokenData = JSON.parse(reuseAttempt);
  //     await this.invalidateAllUserTokens(tokenData.userId);
  //     throw new Error('Token reuse detected - all sessions invalidated');
  //   }
  //
  //   await redis.setex(reuseKey, 3600, JSON.stringify({ detected: true }));
  // }

  private parseExpiryToSeconds(expiry: string): number {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 604800;
    }
  }
}

export const tokenService = new TokenService();
