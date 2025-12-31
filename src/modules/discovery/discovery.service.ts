import { recommendationService } from './recommendation.service.js';
import { profilePermissions } from '../profile/profile.permissions.js';
import { cacheService } from '../../utils/cache.service.js';
import { decodeCursor, createPaginationResult } from '../../utils/pagination.js';
import { logger } from '../../utils/logger.js';

export class DiscoveryService {
  async getRecommended(userId: string, cursorStr: string | undefined, limit: number) {
    const cursor = cursorStr ? decodeCursor(cursorStr) : null;

    const cacheKey = cacheService.buildKey('discovery', 'recommended', 'user', userId, 'cursor', cursorStr || 'first');

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info('Returning cached recommended profiles', { userId, cacheKey });
      return cached;
    }

    const profiles = await recommendationService.getRecommendations(userId, cursor, limit);

    // const maskedProfiles = profiles.map((profile: any) =>
    //   profilePermissions.maskProfile(profile as any, { userId })
    // );
    console.log(profiles);


    const maskedProfiles = await Promise.all(
      profiles.map((profile: any) =>
        profilePermissions.maskProfile(profile as any, { userId })
      )
    );
    console.log(maskedProfiles);


    const result = createPaginationResult(profiles, limit);
    console.log(result);


    await cacheService.set(cacheKey, { ...result, data: maskedProfiles }, 120);

    return { ...result, data: maskedProfiles };
  }

  async getNewToday(userId: string, cursorStr: string | undefined, limit: number) {
    const cursor = cursorStr ? decodeCursor(cursorStr) : null;

    const cacheKey = cacheService.buildKey('discovery', 'new', 'user', userId, 'cursor', cursorStr || 'first');

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info('Returning cached new profiles', { userId, cacheKey });
      return cached;
    }

    const profiles = await recommendationService.getNewProfiles(userId, cursor, limit);

    // const maskedProfiles = profiles.map((profile: any) =>
    //   profilePermissions.maskProfile(profile as any, { userId })
    // );
    const maskedProfiles = await Promise.all(
      profiles.map((profile: any) =>
        profilePermissions.maskProfile(profile as any, { userId })
      )
    );

    const result = createPaginationResult(profiles, limit);

    await cacheService.set(cacheKey, { ...result, data: maskedProfiles }, 60);

    return { ...result, data: maskedProfiles };
  }

  async getNearby(userId: string, cursorStr: string | undefined, limit: number) {
    const cursor = cursorStr ? decodeCursor(cursorStr) : null;

    const cacheKey = cacheService.buildKey('discovery', 'nearby', 'user', userId, 'cursor', cursorStr || 'first');

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      logger.info('Returning cached nearby profiles', { userId, cacheKey });
      return cached;
    }

    const profiles = await recommendationService.getNearbyProfiles(userId, cursor, limit);

    // const maskedProfiles = profiles.map((profile: any) =>
    //   profilePermissions.maskProfile(profile as any, { userId })
    // );
    const maskedProfiles = await Promise.all(
      profiles.map((profile: any) =>
        profilePermissions.maskProfile(profile as any, { userId })
      )
    );

    const result = createPaginationResult(profiles, limit);

    await cacheService.set(cacheKey, { ...result, data: maskedProfiles }, 120);

    return { ...result, data: maskedProfiles };
  }
}

export const discoveryService = new DiscoveryService();
