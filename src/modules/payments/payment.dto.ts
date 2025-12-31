import { z } from 'zod';

export const checkoutSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
  planCode: z.enum(['ALAAP', 'JATRA', 'AALOK', 'OBHIJAAT'], {
    errorMap: () => ({ message: 'Invalid plan code' }),
  }),
  gateway: z.enum(['sslcommerz', 'stripe', 'bkash', 'applepay'], {
    errorMap: () => ({ message: 'Invalid payment gateway' }),
  }),
  currency: z.string().optional(),
  couponCode: z.string().optional(),
});

export const pauseSubscriptionSchema = z.object({
  pauseDays: z
    .number()
    .int()
    .min(1, 'Minimum pause duration is 1 day')
    .max(30, 'Maximum pause duration is 30 days'),
});

export const cancelSubscriptionSchema = z.object({
  profileId: z.string().uuid('Invalid profile ID'),
});

export type CheckoutDTO = z.infer<typeof checkoutSchema>;
export type PauseSubscriptionDTO = z.infer<typeof pauseSubscriptionSchema>;
export type CancelSubscriptionDTO = z.infer<typeof cancelSubscriptionSchema>;
