import { z } from 'zod';

export const paginationSchema = z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    status: z.string().optional(),
    search: z.string().optional()
});

export const userUpdateSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    role: z.string().optional()
});

export const vendorStatusSchema = z.object({
    status: z.enum(['REGISTERED', 'PLAN_SELECTED', 'PROFILE_COMPLETED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'])
});

export const bookingStatusSchema = z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])
});
