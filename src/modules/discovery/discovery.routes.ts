import { Router } from 'express';
import { discoveryController } from './discovery.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = Router();

router.get(
  '/recommended',
  authenticateToken,
  discoveryController.getRecommended.bind(discoveryController)
);

router.get(
  '/new',
  authenticateToken,
  discoveryController.getNewToday.bind(discoveryController)
);

router.get(
  '/nearby',
  authenticateToken,
  discoveryController.getNearby.bind(discoveryController)
);

export default router;
