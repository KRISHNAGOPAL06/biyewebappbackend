export type NotificationType =
  | 'otp'
  | 'interest_received'
  | 'interest_accepted'
  | 'new_message'
  | 'profile_view'
  | 'guardian_added'
  | 'subscription'
  | 'subscription_activated'
  | 'subscription_expired'
  | 'subscription_upgraded'
  | 'payment_failed'
  | 'moderation';

export type NotificationPriority = 'IMMEDIATE' | 'HIGH' | 'LOW';

export interface NotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, any>;
  priority?: NotificationPriority;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  deliveredAt: Date | null;
  createdAt: Date;
}

export interface NotificationPreferenceResponse {
  id: string;
  userId: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface NotificationListQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
  type?: NotificationType;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}
