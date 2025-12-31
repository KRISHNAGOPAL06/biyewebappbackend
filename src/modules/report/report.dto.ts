import { z } from 'zod';

export const CreateReportSchema = z.object({
    reportedProfileId: z.string().uuid(),
    reason: z.enum([
        'Fake profile',
        'Inappropriate content',
        'Harassment or Abuse',
        'Spam or scam',
        'Other',
    ]),
    details: z.string().max(1000).optional(),
    screenshotUrl: z.string().url().optional(),
});

export type CreateReportDTO = z.infer<typeof CreateReportSchema>;
