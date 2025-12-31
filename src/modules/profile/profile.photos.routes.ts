import { Router } from 'express';
import { mediaController } from '../media/media.controller.js';
import { optionalAuthMiddleware } from '../../middleware/authMiddleware.js';

const router = Router();

router.get(
  '/:profileId/photos',
  optionalAuthMiddleware,
  mediaController.listProfilePhotos.bind(mediaController)
);

export default router;
