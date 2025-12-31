import { Router } from 'express';
import { bookingController } from './booking.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateToken } from '../../../middleware/authMiddleware.js';
import { authenticateVendor, requireApprovedVendor } from '../middleware/vendor-auth.middleware.js';
import { BookingCreateSchema, BookingRespondSchema, BookingCancelSchema } from '../vendor.dto.js';

const router = Router();

// ==================== USER ROUTES ====================

// Create booking (User)
router.post(
    '/user',
    authenticateToken,
    validate(BookingCreateSchema),
    bookingController.create.bind(bookingController)
);

// Get user's bookings
router.get(
    '/user',
    authenticateToken,
    bookingController.getMyBookings.bind(bookingController)
);

// Get booking by ID (User)
router.get(
    '/user/:id',
    authenticateToken,
    bookingController.getByIdForUser.bind(bookingController)
);

// Cancel booking (User)
router.put(
    '/user/:id/cancel',
    authenticateToken,
    validate(BookingCancelSchema),
    bookingController.cancelByUser.bind(bookingController)
);

// ==================== VENDOR ROUTES ====================

// Get vendor's bookings
router.get(
    '/vendor',
    authenticateVendor,
    bookingController.getVendorBookings.bind(bookingController)
);

// Get vendor booking stats
router.get(
    '/vendor/stats',
    authenticateVendor,
    bookingController.getVendorStats.bind(bookingController)
);

// Get booking by ID (Vendor)
router.get(
    '/vendor/:id',
    authenticateVendor,
    bookingController.getByIdForVendor.bind(bookingController)
);

// Accept booking (Vendor)
router.put(
    '/vendor/:id/accept',
    authenticateVendor,
    requireApprovedVendor,
    validate(BookingRespondSchema),
    bookingController.accept.bind(bookingController)
);

// Reject booking (Vendor)
router.put(
    '/vendor/:id/reject',
    authenticateVendor,
    requireApprovedVendor,
    validate(BookingRespondSchema),
    bookingController.reject.bind(bookingController)
);

// Complete booking (Vendor)
router.put(
    '/vendor/:id/complete',
    authenticateVendor,
    requireApprovedVendor,
    bookingController.complete.bind(bookingController)
);

// Cancel booking (Vendor)
router.put(
    '/vendor/:id/cancel',
    authenticateVendor,
    validate(BookingCancelSchema),
    bookingController.cancelByVendor.bind(bookingController)
);

export default router;
