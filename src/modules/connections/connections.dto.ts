import { z } from 'zod';

export const SendInterestSchema = z.object({
  toUserId: z.string().uuid(),
});

export const AcceptInterestSchema = z.object({
  fromUserId: z.string().uuid(),
});

export const DeclineInterestSchema = z.object({
  fromUserId: z.string().uuid(),
});

export const WithdrawInterestSchema = z.object({
  toUserId: z.string().uuid(),
});

export type SendInterestDTO = z.infer<typeof SendInterestSchema>;
export type AcceptInterestDTO = z.infer<typeof AcceptInterestSchema>;
export type DeclineInterestDTO = z.infer<typeof DeclineInterestSchema>;
export type WithdrawInterestDTO = z.infer<typeof WithdrawInterestSchema>;
