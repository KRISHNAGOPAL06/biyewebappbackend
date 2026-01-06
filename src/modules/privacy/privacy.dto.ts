import { z } from 'zod';

export const UpdatePhotoPrivacySchema = z.object({
    privacyLevel: z.enum(['public', 'connections', 'request']),
});

export type UpdatePhotoPrivacyDTO = z.infer<typeof UpdatePhotoPrivacySchema>;
