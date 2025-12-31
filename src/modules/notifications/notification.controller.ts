import { Request, Response } from 'express';
import { notificationService } from './notification.service.js';
import { notificationPreferenceService } from './notificationPreference.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { NotificationQueryDTO, UpdatePreferencesDTO } from './notification.dto.js';

class NotificationController {
  async listNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const query = req.query as unknown as NotificationQueryDTO;

      const result = await notificationService.listNotifications(userId, {
        page: Number(query.page) || 1,
        limit: Number(query.limit) || 20,
        unreadOnly: query.unreadOnly === true || query.unreadOnly === 'true' as any,
        type: query.type,
      });

      sendSuccess(res, result, 'Notifications retrieved successfully');
    } catch (error) {
      logger.error('Failed to list notifications', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });
      sendError(res, 'Failed to retrieve notifications', 500, 'NOTIFICATION_LIST_ERROR');
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);

      if (!notification) {
        sendError(res, 'Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
        return;
      }

      sendSuccess(res, notification, 'Notification marked as read');
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
        notificationId: req.params.id,
      });
      sendError(res, 'Failed to mark notification as read', 500, 'MARK_READ_ERROR');
    }
  }

  async markAllAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const count = await notificationService.markAllAsRead(userId);

      sendSuccess(res, { markedCount: count }, `${count} notifications marked as read`);
    } catch (error) {
      logger.error('Failed to mark all notifications as read', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });
      sendError(res, 'Failed to mark all notifications as read', 500, 'MARK_ALL_READ_ERROR');
    }
  }

  async getPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const preferences = await notificationPreferenceService.getPreferences(userId);

      sendSuccess(res, preferences, 'Notification preferences retrieved');
    } catch (error) {
      logger.error('Failed to get notification preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });
      sendError(res, 'Failed to retrieve notification preferences', 500, 'PREFERENCES_GET_ERROR');
    }
  }

  async updatePreferences(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;
      const data = req.body as UpdatePreferencesDTO;

      const preferences = await notificationPreferenceService.updatePreferences(userId, data);

      sendSuccess(res, preferences, 'Notification preferences updated');
    } catch (error) {
      logger.error('Failed to update notification preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });
      sendError(res, 'Failed to update notification preferences', 500, 'PREFERENCES_UPDATE_ERROR');
    }
  }

  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.userId!;

      const count = await notificationService.getUnreadCount(userId);

      sendSuccess(res, { unreadCount: count }, 'Unread count retrieved');
    } catch (error) {
      logger.error('Failed to get unread count', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: req.userId,
      });
      sendError(res, 'Failed to retrieve unread count', 500, 'UNREAD_COUNT_ERROR');
    }
  }
}

export const notificationController = new NotificationController();
