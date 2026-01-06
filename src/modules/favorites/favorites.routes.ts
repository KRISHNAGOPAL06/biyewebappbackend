import { Router } from 'express';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { favoritesController } from './favorites.controller.js';

const router = Router();

router.post('/', authenticateToken, favoritesController.addToFavorites.bind(favoritesController));
router.get('/', authenticateToken, favoritesController.getFavorites.bind(favoritesController));
router.delete('/:id', authenticateToken, favoritesController.removeFavorite.bind(favoritesController));

export default router;
