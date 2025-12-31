import { Request, Response, NextFunction } from 'express';
import { searchService } from './search.service.js';
import { savedSearchService } from './saved-search.service.js';
import { SearchRequestDTO, SaveSearchDTO } from './search.dto.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export class SearchController {
  async search(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const dto: SearchRequestDTO = req.body;

      logger.info('Search request received', {
        userId,
        hasBasic: !!dto.basic,
        hasAdvanced: !!dto.advanced,
        limit: dto.limit,
        requestId: req.requestId,
      });

      const result = await searchService.search(userId, dto);

      return sendSuccess(res, result, 'Search completed', 200);
    } catch (error) {
      return next(error);
    }
  }

  async saveSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const dto: SaveSearchDTO = req.body;

      const savedSearch = await savedSearchService.saveSearch(userId, dto);

      return sendSuccess(res, savedSearch, 'Search saved successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getSavedSearches(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;

      const savedSearches = await savedSearchService.getSavedSearches(userId);

      return sendSuccess(res, savedSearches, 'Saved searches retrieved', 200);
    } catch (error) {
      return next(error);
    }
  }

  async deleteSavedSearch(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      await savedSearchService.deleteSavedSearch(userId, id);

      return sendSuccess(res, null, 'Saved search deleted', 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const searchController = new SearchController();
