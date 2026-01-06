import { logger } from '../../utils/logger.js';
import { eventBus, NotificationEvent } from '../../events/eventBus.js';
import { notificationService } from './notification.service.js';
import { notificationPreferenceService } from './notificationPreference.service.js';
import { getTemplate } from './notification.templates.js';
import {
  PRIORITY_CONFIG,
  DEFAULT_PRIORITY_BY_TYPE,
} from './notification.priorities.js';
import { NotificationPriority, NotificationType } from './notification.types.js';

interface QueuedNotification {
  event: NotificationEvent;
  attempts: number;
  nextAttemptAt: number;
}

class NotificationDispatcher {
  private queue: QueuedNotification[] = [];
  private processing = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupEventListener();
    this.startProcessingLoop();
  }

  private setupEventListener(): void {
    eventBus.onNotification(async (event) => {
      console.log("🎯 EVENT RECEIVED BY DISPATCHER", event);
      await this.handle(event);
    });
    logger.info('Notification dispatcher: event listener registered');
  }

  private startProcessingLoop(): void {
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 1000);
    logger.info('Notification dispatcher: processing loop started');
  }

  async handle(event: NotificationEvent): Promise<void> {
    const priority = event.priority ||
      DEFAULT_PRIORITY_BY_TYPE[event.type as NotificationType] ||
      'LOW';

    logger.info('Notification dispatcher: handling event', {
      userId: event.userId,
      type: event.type,
      priority,
    });

    this.enqueue({
      event: { ...event, priority },
      attempts: 0,
      nextAttemptAt: Date.now(),
    });

    if (priority === 'IMMEDIATE') {
      await this.processQueue();
    }
  }

  private enqueue(notification: QueuedNotification): void {
    this.queue.push(notification);
    this.queue.sort((a, b) => {
      const priorityOrder: Record<NotificationPriority, number> = {
        IMMEDIATE: 0,
        HIGH: 1,
        LOW: 2,
      };
      const aPriority = a.event.priority || 'LOW';
      const bPriority = b.event.priority || 'LOW';
      return priorityOrder[aPriority] - priorityOrder[bPriority];
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const now = Date.now();
      const readyNotifications = this.queue.filter(
        (n) => n.nextAttemptAt <= now
      );

      for (const notification of readyNotifications) {
        await this.deliver(notification);
        const index = this.queue.indexOf(notification);
        if (index > -1) {
          this.queue.splice(index, 1);
        }
      }
    } catch (error) {
      logger.error('Notification dispatcher: queue processing error', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.processing = false;
    }
  }

  private async deliver(notification: QueuedNotification): Promise<void> {

    const { event } = notification;
    console.log("🚚 DELIVER CALLED", {
      userId: event.userId,
      type: event.type
    });
    const priority = (event.priority || 'LOW') as NotificationPriority;
    const config = PRIORITY_CONFIG[priority];

    console.log(`📋 Priority: ${priority}, Config:`, config);

    try {
      console.log(`🔍 Fetching preferences for user: ${event.userId}`);
      const preferences = await notificationPreferenceService.getPreferences(
        event.userId
      );

      console.log(`⚙️ User preferences:`, preferences);

      const template = getTemplate(event.type, event.metadata || {});
      console.log(`📝 Template generated:`, { title: template.title, body: template.body });

      if (config.deliveryMethods.includes('in_app') && preferences.inAppEnabled) {
        console.log(`💾 Attempting in-app notification save...`);
        try {
          await notificationService.createInAppNotification({
            userId: event.userId,
            type: event.type as NotificationType,
            title: template.title,
            body: template.body,
            metadata: event.metadata,
            priority,
          });
          console.log(`✅ In-app notification saved successfully`);
        } catch (saveError) {
          console.error(`❌ In-app save failed:`, saveError);
          throw saveError;
        }
      } else {
        console.log(`⏭️ Skipping in-app: deliveryMethods=${config.deliveryMethods}, inAppEnabled=${preferences.inAppEnabled}`);
      }

      if (config.deliveryMethods.includes('email') && preferences.emailEnabled) {
        console.log(`📧 Attempting email notification...`);
        await notificationService.sendEmailNotification(
          event.userId,
          template.emailSubject || template.title,
          template.emailBody || template.body
        );
        console.log(`✅ Email sent successfully`);
      }

      if (config.deliveryMethods.includes('push') && preferences.pushEnabled) {
        console.log(`📱 Attempting push notification...`);
        await notificationService.sendPushNotification(
          event.userId,
          template.title,
          template.body,
          event.metadata
        );
        console.log(`✅ Push sent successfully`);
      }

      logger.info('Notification delivered successfully', {
        userId: event.userId,
        type: event.type,
        priority,
        deliveryMethods: config.deliveryMethods.filter((method) => {
          if (method === 'email') return preferences.emailEnabled;
          if (method === 'push') return preferences.pushEnabled;
          if (method === 'in_app') return preferences.inAppEnabled;
          return false;
        }),
      });
    } catch (error) {
      notification.attempts++;
      const shouldRetry = notification.attempts < config.retryAttempts;

      console.error(`❌ Notification delivery failed (attempt ${notification.attempts}/${config.retryAttempts}):`, error);

      logger.error('Notification delivery failed', {
        userId: event.userId,
        type: event.type,
        attempt: notification.attempts,
        maxAttempts: config.retryAttempts,
        willRetry: shouldRetry,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      if (shouldRetry) {
        notification.nextAttemptAt = Date.now() + config.retryDelayMs;
        this.enqueue(notification);
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
