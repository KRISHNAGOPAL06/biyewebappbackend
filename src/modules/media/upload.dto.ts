import { z } from 'zod';

export const CreateUploadUrlSchema = z.object({
  profileId: z.string().uuid('Profile ID must be a valid UUID'),
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  mimeType: z.string().regex(/^image\/(jpeg|png|webp|avif)$/, 'Invalid MIME type'),
  fileSize: z.number().int().positive('File size must be positive'),
  privacyLevel: z.enum(['public', 'matches', 'on_request', 'private'], {
    errorMap: () => ({ message: 'Invalid privacy level' }),
  }),
});

export type CreateUploadUrlDTO = z.infer<typeof CreateUploadUrlSchema>;

export const ModerationCallbackSchema = z.object({
  objectKey: z.string().min(1, 'Object key is required'),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be approved or rejected' }),
  }),
  finalUrl: z.string().url('Final URL must be a valid URL').optional(),
  fileSize: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
  note: z.string().optional(),
});

export type ModerationCallbackDTO = z.infer<typeof ModerationCallbackSchema>;

export const UpdatePhotoPrivacySchema = z.object({
  privacyLevel: z.enum(['public', 'matches', 'on_request', 'private']),
});
export type UpdatePhotoPrivacyDTO = z.infer<typeof UpdatePhotoPrivacySchema>;
