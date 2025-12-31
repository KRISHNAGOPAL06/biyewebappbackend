import { z } from 'zod';

export const createThreadSchema = z.object({
  participantIds: z
    .array(z.string().uuid())
    .min(1, 'At least 2 participants required')
    .max(10, 'Maximum 10 participants allowed'),
});

export const getThreadsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
});

export const getMessagesQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z
    .string()
    .optional()
    .default('50')
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().min(1).max(100)),
});

export const markAsReadSchema = z.object({
  uptoMessageId: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
});

export const privateMessageSchema = z.object({
  threadId: z.string().uuid().optional(),
  toUserId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  metadata: z.record(z.any()).optional(),
});

export type CreateThreadInput = z.infer<typeof createThreadSchema>;
export type GetThreadsQuery = z.infer<typeof getThreadsQuerySchema>;
export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;
export type MarkAsReadInput = z.infer<typeof markAsReadSchema>;
export type PrivateMessageInput = z.infer<typeof privateMessageSchema>;
