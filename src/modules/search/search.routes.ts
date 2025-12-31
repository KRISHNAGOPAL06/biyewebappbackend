import { Router } from 'express';
import { searchController } from './search.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { SearchRequestSchema, SaveSearchSchema } from './search.dto.js';

const router = Router();

router.post(
  '/',
  authenticateToken,
  validate(SearchRequestSchema),
  searchController.search.bind(searchController)
);

router.post(
  '/save',
  authenticateToken,
  validate(SaveSearchSchema),
  searchController.saveSearch.bind(searchController)
);

router.get(
  '/saved',
  authenticateToken,
  searchController.getSavedSearches.bind(searchController)
);

router.delete(
  '/saved/:id',
  authenticateToken,
  searchController.deleteSavedSearch.bind(searchController)
);

export default router;
