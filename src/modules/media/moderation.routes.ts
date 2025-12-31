import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { moderationController } from './moderation.controller.js';
import { validate } from '../../middleware/validate.js';
import { ModerationCallbackSchema } from './upload.dto.js';

const router = Router();

const moderationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 100,
  message: 'Too many moderation callbacks from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  '/callback',
  moderationLimiter,
  validate(ModerationCallbackSchema),
  moderationController.handleCallback.bind(moderationController)
);

export default router;
