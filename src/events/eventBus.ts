import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

export interface NotificationEvent {
  userId: string;
  type: string;
  metadata?: Record<string, any>;
  priority?: 'IMMEDIATE' | 'HIGH' | 'LOW';
}

export interface SubscriptionEvent {
  userId: string;
  profileId: string;
  eventType: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'expired' | 'resumed';
  subscription: {
    id: string;
    planCode: string;
    planName: string;
    status: string;
    startDate: Date;
    endDate: Date;
    features?: Record<string, any>;
  };
}

class TypedEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  emitNotification(event: NotificationEvent): boolean {
    logger.info('Event bus: emitting notification event', {
      userId: event.userId,
      type: event.type,
      priority: event.priority || 'LOW',
    });
    return this.emit('notify', event);
  }

  onNotification(handler: (event: NotificationEvent) => Promise<void> | void): this {
    return this.on('notify', handler);
  }

  emitSubscriptionUpdate(event: SubscriptionEvent): boolean {
    logger.info('Event bus: emitting subscription event', {
      userId: event.userId,
      profileId: event.profileId,
      eventType: event.eventType,
      planCode: event.subscription.planCode,
    });
    return this.emit('subscription:update', event);
  }

  onSubscriptionUpdate(handler: (event: SubscriptionEvent) => Promise<void> | void): this {
    return this.on('subscription:update', handler);
  }
}

export const eventBus = new TypedEventBus();
