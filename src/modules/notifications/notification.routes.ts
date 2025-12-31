import { Router } from 'express';
import { notificationController } from './notification.controller.js';
import { deviceTokenController } from './deviceToken.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { UpdatePreferencesSchema } from './notification.dto.js';

const router = Router();

// Notification endpoints
router.get(
  '/',
  authenticateToken,
  notificationController.listNotifications.bind(notificationController)
);

router.get(
  '/unread-count',
  authenticateToken,
  notificationController.getUnreadCount.bind(notificationController)
);

router.patch(
  '/read-all',
  authenticateToken,
  notificationController.markAllAsRead.bind(notificationController)
);

router.patch(
  '/:id/read',
  authenticateToken,
  notificationController.markAsRead.bind(notificationController)
);

router.get(
  '/preferences',
  authenticateToken,
  notificationController.getPreferences.bind(notificationController)
);

router.patch(
  '/preferences',
  authenticateToken,
  validate(UpdatePreferencesSchema),
  notificationController.updatePreferences.bind(notificationController)
);

// Device token endpoints
router.post(
  '/device-token',
  authenticateToken,
  deviceTokenController.saveDeviceToken.bind(deviceTokenController)
);

router.delete(
  '/device-token/:token',
  authenticateToken,
  deviceTokenController.deleteDeviceToken.bind(deviceTokenController)
);

export default router;
