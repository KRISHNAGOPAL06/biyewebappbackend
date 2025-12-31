import { Notification, Prisma } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import {
  NotificationPayload,
  NotificationResponse,
  NotificationListResponse,
  EmailPayload,
  PushPayload,
} from './notification.types.js';
import { NotificationQueryDTO } from './notification.dto.js';

import { prisma } from '../../prisma.js';

class NotificationService {
  async createInAppNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    console.log("📝 DB INSERT ATTEMPT", payload);
    const notification = await prisma.notification.create({
      data: {
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        // metadata: payload.metadata || null,
        metadata: payload.metadata ?? Prisma.JsonNull,

        deliveredAt: new Date(),
      },
    });

    logger.info('In-app notification created', {
      notificationId: notification.id,
      userId: payload.userId,
      type: payload.type,
    });

    return this.formatNotificationResponse(notification);
  }

  async listNotifications(
    userId: string,
    query: NotificationQueryDTO
  ): Promise<NotificationListResponse> {
    const { page, limit, unreadOnly, type } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications: notifications.map((n: Notification) => this.formatNotificationResponse(n)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponse | null> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return null;
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    logger.info('Notification marked as read', {
      notificationId,
      userId,
    });

    return this.formatNotificationResponse(updated);
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    logger.info('All notifications marked as read', {
      userId,
      count: result.count,
    });

    return result.count;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return false;
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    logger.info('Notification deleted', {
      notificationId,
      userId,
    });

    return true;
  }

  async sendEmailNotification(
    userId: string,
    subject: string,
    body: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      logger.warn('Cannot send email: user email not found', { userId });
      return;
    }

    await this.sendEmail({
      to: user.email,
      subject,
      body,
    });
  }

  private async sendEmail(payload: EmailPayload): Promise<void> {
    logger.info('Email notification queued (stub)', {
      to: payload.to,
      subject: payload.subject,
    });
  }

  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<void> {
    await this.sendPush({
      userId,
      title,
      body,
      data,
    });
  }

  private async sendPush(payload: PushPayload): Promise<void> {
    try {
      const deviceTokens = await prisma.deviceToken.findMany({
        where: { userId: payload.userId },
        select: { token: true },
      });

      if (deviceTokens.length === 0) {
        logger.info('No device tokens found for push notification', {
          userId: payload.userId,
          title: payload.title,
        });
        return;
      }

      // Import FCM client and send to all device tokens
      const { sendPushNotification: sendFCM } = await import('./fcm.client.js');

      for (const deviceToken of deviceTokens) {
        await sendFCM(deviceToken.token, payload.title, payload.body, payload.data || {});
      }

      logger.info('Push notifications sent via FCM', {
        userId: payload.userId,
        title: payload.title,
        tokenCount: deviceTokens.length,
      });
    } catch (error) {
      logger.error('Failed to send push notifications', {
        userId: payload.userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private formatNotificationResponse(notification: Notification): NotificationResponse {
    return {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      isRead: notification.isRead,
      deliveredAt: notification.deliveredAt,
      createdAt: notification.createdAt,
    };
  }
}

export const notificationService = new NotificationService();
