import { Router } from 'express';
import { privacyController } from './privacy.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { UpdatePhotoPrivacySchema } from './privacy.dto.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// GET /api/v1/privacy/settings - Get privacy settings
router.get(
    '/settings',
    privacyController.getPrivacySettings.bind(privacyController)
);

// PATCH /api/v1/privacy/photo-visibility - Update photo privacy
router.patch(
    '/photo-visibility',
    validate(UpdatePhotoPrivacySchema),
    privacyController.updatePhotoPrivacy.bind(privacyController)
);

export default router;
