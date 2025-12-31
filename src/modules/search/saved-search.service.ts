import { SaveSearchDTO } from '../discovery/search.dto.js';
import { logger } from '../../utils/logger.js';

import { prisma } from '../../prisma.js';

export class SavedSearchService {
  async saveSearch(userId: string, dto: SaveSearchDTO) {
    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        name: dto.name,
        filters: dto.filters as any,
      },
    });

    logger.info('Search saved', { userId, savedSearchId: savedSearch.id, name: dto.name });

    return savedSearch;
  }

  async getSavedSearches(userId: string) {
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return savedSearches;
  }

  async deleteSavedSearch(userId: string, savedSearchId: string) {
    const savedSearch = await prisma.savedSearch.findUnique({
      where: { id: savedSearchId },
    });

    if (!savedSearch) {
      throw new Error('Saved search not found');
    }

    if (savedSearch.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own saved searches');
    }

    await prisma.savedSearch.delete({
      where: { id: savedSearchId },
    });

    logger.info('Saved search deleted', { userId, savedSearchId });
  }
}

export const savedSearchService = new SavedSearchService();
