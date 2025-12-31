import { NotificationPriority, NotificationType } from './notification.types.js';

export const PRIORITY_LEVELS = {
  IMMEDIATE: 'IMMEDIATE',
  HIGH: 'HIGH',
  LOW: 'LOW',
} as const;

export interface PriorityConfig {
  deliveryMethods: ('email' | 'push' | 'in_app')[];
  retryAttempts: number;
  retryDelayMs: number;
}

export const PRIORITY_CONFIG: Record<NotificationPriority, PriorityConfig> = {
  IMMEDIATE: {
    deliveryMethods: ['push', 'email', 'in_app'],
    retryAttempts: 3,
    retryDelayMs: 1000,
  },
  // IMMEDIATE: {
  //   deliveryMethods: ['email', 'in_app'],
  //   retryAttempts: 3,
  //   retryDelayMs: 1000,
  // },
  HIGH: {
    deliveryMethods: ['push', 'in_app'],
    retryAttempts: 2,
    retryDelayMs: 5000,
  },
  LOW: {
    deliveryMethods: ['in_app'],
    retryAttempts: 1,
    retryDelayMs: 10000,
  },
};

export const DEFAULT_PRIORITY_BY_TYPE: Record<NotificationType, NotificationPriority> = {
  otp: 'IMMEDIATE',
  interest_received: 'HIGH',
  interest_accepted: 'HIGH',
  new_message: 'HIGH',
  profile_view: 'LOW',
  guardian_added: 'IMMEDIATE',
  subscription: 'IMMEDIATE',
  moderation: 'HIGH',
  subscription_activated: 'IMMEDIATE',
  subscription_expired: 'IMMEDIATE',
  subscription_upgraded: 'IMMEDIATE',
  payment_failed: 'IMMEDIATE'
};
