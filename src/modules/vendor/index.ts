import { Router } from 'express';

// Import all vendor sub-routes
import vendorAuthRoutes from './auth/vendor-auth.routes.js';
import categoryRoutes from './categories/category.routes.js';
import vendorServiceRoutes from './services/vendor-service.routes.js';
import vendorProfileRoutes from './profile/vendor-profile.routes.js';
import bookingRoutes from './bookings/booking.routes.js';
import reviewRoutes from './reviews/review.routes.js';
import paymentRoutes from './payments/payment.routes.js';
import vendorAdminRoutes from './admin/vendor-admin.routes.js';
import { vendorOnboardingRoutes } from './onboarding/vendor-onboarding.routes.js';
import uploadRoutes from './upload/upload.routes.js';

const router = Router();

/**
 * Vendor Module Routes
 * 
 * All routes are prefixed with /api/v1/vendor
 * 
 * Auth Routes: /api/v1/vendor/auth/*
 * Category Routes: /api/v1/vendor/categories/*
 * Service Routes: /api/v1/vendor/services/*
 * Profile Routes: /api/v1/vendor/profile/*
 * Booking Routes: /api/v1/vendor/bookings/*
 * Review Routes: /api/v1/vendor/reviews/*
 * Payment Routes: /api/v1/vendor/payments/*
 * Upload Routes: /api/v1/vendor/uploads/*
 * Admin Routes: /api/v1/vendor/admin/*
 */

// Vendor Authentication
router.use('/auth', vendorAuthRoutes);

// Service Categories (Admin-controlled, public read)
router.use('/categories', categoryRoutes);

// Vendor Services (CRUD by vendor, public search)
router.use('/services', vendorServiceRoutes);

// Vendor Profile (vendor management, public view)
router.use('/profile', vendorProfileRoutes);

// Service Bookings (User creates, Vendor manages)
router.use('/bookings', bookingRoutes);

// Service Reviews (User creates, Vendor replies)
router.use('/reviews', reviewRoutes);

// Vendor Payments (full tracking with OTP verification)
router.use('/payments', paymentRoutes);

// Onboarding Flow (Plans & Profile)
router.use('/onboarding', vendorOnboardingRoutes);

// File Uploads
router.use('/uploads', uploadRoutes);

// Admin Panel (Admin only)
router.use('/admin', vendorAdminRoutes);

export default router;

