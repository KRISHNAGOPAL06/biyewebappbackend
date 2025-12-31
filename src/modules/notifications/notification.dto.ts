import { z } from 'zod';

export const NotificationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional().default(false),
  type: z.enum([
    'otp',
    'interest_received',
    'interest_accepted',
    'new_message',
    'profile_view',
    'guardian_added',
    'subscription',
    'moderation',
  ]).optional(),
});

export const NotificationIdParamSchema = z.object({
  id: z.string().uuid('Invalid notification ID'),
});

export const UpdatePreferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export type NotificationQueryDTO = z.infer<typeof NotificationQuerySchema>;
export type NotificationIdParamDTO = z.infer<typeof NotificationIdParamSchema>;
export type UpdatePreferencesDTO = z.infer<typeof UpdatePreferencesSchema>;
