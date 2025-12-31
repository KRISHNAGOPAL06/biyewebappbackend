import { Router } from 'express';
import { profileController } from './profile.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import {
  CreateProfileSchema,
  StepUpdateSchema,
} from './profile.dto.js';

const router = Router();

router.post(
  '/',
  authenticateToken,
  validate(CreateProfileSchema),
  profileController.createProfile.bind(profileController)
);

router.get('/me', authenticateToken, profileController.getMyProfile.bind(profileController));

router.get('/:id', authenticateToken, profileController.getProfileById.bind(profileController));

router.patch(
  '/:id/step',
  authenticateToken,
  validate(StepUpdateSchema as any),
  profileController.updateProfileStep.bind(profileController)
);

router.post('/:id/publish', authenticateToken, profileController.publishProfile.bind(profileController));

router.post(
  '/:id/unpublish',
  authenticateToken,
  profileController.unpublishProfile.bind(profileController)
);

router.delete('/:id', authenticateToken, profileController.deleteProfile.bind(profileController));

export default router;
