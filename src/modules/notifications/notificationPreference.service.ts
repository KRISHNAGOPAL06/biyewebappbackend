import { NotificationPreference } from '@prisma/client';
import { logger } from '../../utils/logger.js';
import { NotificationPreferenceResponse } from './notification.types.js';
import { UpdatePreferencesDTO } from './notification.dto.js';

import { prisma } from '../../prisma.js';

class NotificationPreferenceService {
  async getPreferences(userId: string): Promise<NotificationPreferenceResponse> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return this.formatPreferenceResponse(preferences);
  }

  async updatePreferences(
    userId: string,
    data: UpdatePreferencesDTO
  ): Promise<NotificationPreferenceResponse> {
    const existing = await prisma.notificationPreference.findUnique({
      where: { userId },
    });

    let preferences: NotificationPreference;

    if (existing) {
      preferences = await prisma.notificationPreference.update({
        where: { userId },
        data: {
          emailEnabled: data.emailEnabled ?? existing.emailEnabled,
          pushEnabled: data.pushEnabled ?? existing.pushEnabled,
          inAppEnabled: data.inAppEnabled ?? existing.inAppEnabled,
        },
      });
    } else {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          emailEnabled: data.emailEnabled ?? true,
          pushEnabled: data.pushEnabled ?? true,
          inAppEnabled: data.inAppEnabled ?? true,
        },
      });
    }

    logger.info('Notification preferences updated', {
      userId,
      preferences: {
        emailEnabled: preferences.emailEnabled,
        pushEnabled: preferences.pushEnabled,
        inAppEnabled: preferences.inAppEnabled,
      },
    });

    return this.formatPreferenceResponse(preferences);
  }

  async isEmailEnabled(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences.emailEnabled;
  }

  async isPushEnabled(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences.pushEnabled;
  }

  async isInAppEnabled(userId: string): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    return preferences.inAppEnabled;
  }

  private async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    return prisma.notificationPreference.create({
      data: {
        userId,
        emailEnabled: true,
        pushEnabled: true,
        inAppEnabled: true,
      },
    });
  }

  private formatPreferenceResponse(preference: NotificationPreference): NotificationPreferenceResponse {
    return {
      id: preference.id,
      userId: preference.userId,
      emailEnabled: preference.emailEnabled,
      pushEnabled: preference.pushEnabled,
      inAppEnabled: preference.inAppEnabled,
    };
  }
}

export const notificationPreferenceService = new NotificationPreferenceService();
