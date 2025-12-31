import { z } from 'zod';

// ==================== VENDOR ONBOARDING DTOs ====================

export const VendorPlanSelectionSchema = z.object({
    planId: z.string().uuid('Valid plan ID is required'),
});

export type VendorPlanSelectionDTO = z.infer<typeof VendorPlanSelectionSchema>;

export const VendorOnboardingReviewSchema = z.object({
    submit: z.boolean().refine(val => val === true, 'Must submit to proceed'),
});

// ==================== VENDOR AUTH DTOs ====================

export const VendorRegisterSchema = z.object({
    email: z.string().email('Valid email is required'),
    phoneNumber: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    businessName: z.string().min(2, 'Business name must be at least 2 characters'),
    ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
});

export type VendorRegisterDTO = z.infer<typeof VendorRegisterSchema>;

export const VendorVerifyOTPSchema = z.object({
    email: z.string().email('Valid email is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type VendorVerifyOTPDTO = z.infer<typeof VendorVerifyOTPSchema>;

export const VendorLoginSchema = z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
});

export type VendorLoginDTO = z.infer<typeof VendorLoginSchema>;

export const VendorForgotPasswordSchema = z.object({
    email: z.string().email('Valid email is required'),
});

export type VendorForgotPasswordDTO = z.infer<typeof VendorForgotPasswordSchema>;

export const VendorResetPasswordSchema = z.object({
    email: z.string().email('Valid email is required'),
    otp: z.string().length(6, 'OTP must be 6 digits'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export type VendorResetPasswordDTO = z.infer<typeof VendorResetPasswordSchema>;

// ==================== VENDOR PROFILE DTOs ====================

export const VendorProfileUpdateSchema = z.object({
    tagline: z.string().optional(),
    description: z.string().max(2000).optional(),
    logo: z.string().optional(),
    coverImage: z.string().optional(),
    images: z.array(z.string()).max(10).optional(),

    // Category
    categoryId: z.string().uuid().optional(),

    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    country: z.string().max(100).optional(),
    pincode: z.string().max(20).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    yearsExperience: z.coerce.number().min(0).max(100).optional(),
    yearsInBusiness: z.coerce.number().min(0).max(100).optional(),
    teamSize: z.coerce.number().min(1).optional(),
    website: z.string().max(500).optional(),

    // Service areas
    serviceRegion: z.string().max(100).optional(),
    serviceCities: z.array(z.string()).optional(),
    citiesServed: z.boolean().optional(),
    shipsInternationally: z.boolean().optional(),
    travelPolicy: z.string().optional(),

    socialLinks: z.object({
        facebook: z.string().url().optional(),
        instagram: z.string().url().optional(),
        twitter: z.string().url().optional(),
        linkedin: z.string().url().optional(),
        youtube: z.string().url().optional(),
    }).optional(),
    workingHours: z.record(z.object({
        open: z.string(),
        close: z.string(),
        closed: z.boolean().optional(),
    })).optional(),
    leadPreferences: z.object({
        minBudget: z.coerce.number().optional(),
        maxBudget: z.coerce.number().optional(),
        minGuests: z.coerce.number().optional(),
        maxGuests: z.coerce.number().optional(),
    }).optional(),
});

export type VendorProfileUpdateDTO = z.infer<typeof VendorProfileUpdateSchema>;

// ==================== SERVICE CATEGORY DTOs ====================

export const ServiceCategoryCreateSchema = z.object({
    name: z.string().min(2, 'Category name must be at least 2 characters').max(100),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    image: z.string().url().optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().min(0).default(0),
});

export type ServiceCategoryCreateDTO = z.infer<typeof ServiceCategoryCreateSchema>;

export const ServiceCategoryUpdateSchema = ServiceCategoryCreateSchema.partial();

export type ServiceCategoryUpdateDTO = z.infer<typeof ServiceCategoryUpdateSchema>;

// ==================== VENDOR SERVICE DTOs ====================

export const VendorServiceCreateSchema = z.object({
    categoryId: z.string().uuid('Valid category ID is required'),
    title: z.string().min(3, 'Title must be at least 3 characters').max(200),
    description: z.string().max(5000).optional(),
    images: z.array(z.string().url()).max(10).optional(),
    basePrice: z.number().positive('Price must be positive'),
    currency: z.string().default('INR'),
    priceUnit: z.enum(['per_event', 'per_hour', 'per_day', 'per_person']).default('per_event'),
    minCapacity: z.number().min(1).optional(),
    maxCapacity: z.number().min(1).optional(),
    duration: z.number().min(1).optional(), // hours
    inclusions: z.array(z.string()).optional(),
    exclusions: z.array(z.string()).optional(),
    isAvailable: z.boolean().default(true),
});

export type VendorServiceCreateDTO = z.infer<typeof VendorServiceCreateSchema>;

export const VendorServiceUpdateSchema = VendorServiceCreateSchema.partial();

export type VendorServiceUpdateDTO = z.infer<typeof VendorServiceUpdateSchema>;

// ==================== BOOKING DTOs ====================

export const BookingCreateSchema = z.object({
    serviceId: z.string().uuid('Valid service ID is required'),
    eventDate: z.string().datetime({ message: 'Valid event date is required' }),
    eventTime: z.string().optional(),
    eventLocation: z.string().max(500).optional(),
    guestCount: z.number().min(1).optional(),
    requirements: z.string().max(2000).optional(),
    userNotes: z.string().max(1000).optional(),
});

export type BookingCreateDTO = z.infer<typeof BookingCreateSchema>;

export const BookingRespondSchema = z.object({
    vendorNotes: z.string().max(1000).optional(),
    totalAmount: z.number().positive().optional(),
});

export type BookingRespondDTO = z.infer<typeof BookingRespondSchema>;

export const BookingCancelSchema = z.object({
    cancelReason: z.string().max(500).optional(),
});

export type BookingCancelDTO = z.infer<typeof BookingCancelSchema>;

// ==================== REVIEW DTOs ====================

export const ReviewCreateSchema = z.object({
    bookingId: z.string().uuid('Valid booking ID is required'),
    rating: z.number().min(1).max(5, 'Rating must be between 1 and 5'),
    title: z.string().max(200).optional(),
    comment: z.string().max(2000).optional(),
    images: z.array(z.string().url()).max(5).optional(),
});

export type ReviewCreateDTO = z.infer<typeof ReviewCreateSchema>;

export const ReviewReplySchema = z.object({
    vendorReply: z.string().max(1000),
});

export type ReviewReplyDTO = z.infer<typeof ReviewReplySchema>;

// ==================== ADMIN VENDOR DTOs ====================

export const VendorApprovalSchema = z.object({
    action: z.enum(['approve', 'reject', 'suspend']),
    reason: z.string().max(500).optional(),
});

export type VendorApprovalDTO = z.infer<typeof VendorApprovalSchema>;

// ==================== QUERY/FILTER DTOs ====================

export const ServiceSearchSchema = z.object({
    categoryId: z.string().uuid().optional(),
    city: z.string().optional(),
    minPrice: z.number().positive().optional(),
    maxPrice: z.number().positive().optional(),
    minRating: z.number().min(1).max(5).optional(),
    isAvailable: z.boolean().optional(),
    search: z.string().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(50).default(10),
    sortBy: z.enum(['price_asc', 'price_desc', 'rating', 'newest']).default('newest'),
});

export type ServiceSearchDTO = z.infer<typeof ServiceSearchSchema>;

export const PaginationSchema = z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
});

export type PaginationDTO = z.infer<typeof PaginationSchema>;

// ==================== PAYMENT DTOs ====================

export const PaymentMethodEnum = z.enum(['CARD', 'UPI', 'NETBANKING', 'WALLET', 'CASH']);
export const PaymentStatusEnum = z.enum(['INITIATED', 'OTP_VERIFIED', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED']);

export const InitiatePaymentSchema = z.object({
    bookingId: z.string().uuid().optional(),
    amount: z.number().positive('Amount must be positive'),
    currency: z.string().default('INR'),
    method: PaymentMethodEnum,
    description: z.string().max(500).optional(),
    metadata: z.record(z.any()).optional(),
});

export type InitiatePaymentDTO = z.infer<typeof InitiatePaymentSchema>;

export const VerifyPaymentOTPSchema = z.object({
    otp: z.string().length(6, 'OTP must be 6 digits'),
});

export type VerifyPaymentOTPDTO = z.infer<typeof VerifyPaymentOTPSchema>;

export const ProcessPaymentSchema = z.object({
    transactionId: z.string().optional(),
    gatewayOrderId: z.string().optional(),
    gatewayName: z.string().optional(),
    gatewayResponse: z.record(z.any()).optional(),
});

export type ProcessPaymentDTO = z.infer<typeof ProcessPaymentSchema>;

export const RefundPaymentSchema = z.object({
    amount: z.number().positive().optional(), // Partial refund
    reason: z.string().max(500),
});

export type RefundPaymentDTO = z.infer<typeof RefundPaymentSchema>;

export const PaymentQuerySchema = z.object({
    status: PaymentStatusEnum.optional(),
    method: PaymentMethodEnum.optional(),
    bookingId: z.string().uuid().optional(),
    fromDate: z.string().datetime().optional(),
    toDate: z.string().datetime().optional(),
    minAmount: z.number().positive().optional(),
    maxAmount: z.number().positive().optional(),
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(10),
    sortBy: z.enum(['createdAt', 'amount', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaymentQueryDTO = z.infer<typeof PaymentQuerySchema>;
