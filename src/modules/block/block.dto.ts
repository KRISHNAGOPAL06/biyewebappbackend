import { z } from 'zod';

export const BlockUserSchema = z.object({
    blockedUserId: z.string().uuid(),
    reason: z.string().max(500).optional(),
});

export type BlockUserDTO = z.infer<typeof BlockUserSchema>;
