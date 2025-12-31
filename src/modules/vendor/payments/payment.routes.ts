import { Router } from 'express';
import { vendorPaymentController } from './payment.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateVendor, authenticateAdmin } from '../middleware/vendor-auth.middleware.js';
import {
    InitiatePaymentSchema,
    VerifyPaymentOTPSchema,
    ProcessPaymentSchema,
    RefundPaymentSchema,
} from '../vendor.dto.js';

const router = Router();

// ==================== VENDOR ROUTES ====================

// Initiate a new payment
router.post(
    '/initiate',
    authenticateVendor,
    validate(InitiatePaymentSchema),
    vendorPaymentController.initiatePayment.bind(vendorPaymentController)
);

// Get payment statistics (must be before :id routes)
router.get(
    '/stats',
    authenticateVendor,
    vendorPaymentController.getPaymentStats.bind(vendorPaymentController)
);

// Get payment history
router.get(
    '/',
    authenticateVendor,
    vendorPaymentController.getPaymentHistory.bind(vendorPaymentController)
);

// Verify payment OTP
router.post(
    '/:id/verify-otp',
    authenticateVendor,
    validate(VerifyPaymentOTPSchema),
    vendorPaymentController.verifyPaymentOTP.bind(vendorPaymentController)
);

// Process payment
router.post(
    '/:id/process',
    authenticateVendor,
    vendorPaymentController.processPayment.bind(vendorPaymentController)
);

// Cancel payment
router.post(
    '/:id/cancel',
    authenticateVendor,
    vendorPaymentController.cancelPayment.bind(vendorPaymentController)
);

// Resend OTP
router.post(
    '/:id/resend-otp',
    authenticateVendor,
    vendorPaymentController.resendOTP.bind(vendorPaymentController)
);

// Get payment by ID
router.get(
    '/:id',
    authenticateVendor,
    vendorPaymentController.getPaymentById.bind(vendorPaymentController)
);

// ==================== ADMIN ROUTES ====================

// Get all payments (admin)
router.get(
    '/admin/all',
    authenticateAdmin,
    vendorPaymentController.getAllPayments.bind(vendorPaymentController)
);

// Get payment by ID (admin - no vendor check)
router.get(
    '/admin/:id',
    authenticateAdmin,
    vendorPaymentController.getPaymentByIdAdmin.bind(vendorPaymentController)
);

// Refund payment (admin)
router.post(
    '/:id/refund',
    authenticateAdmin,
    validate(RefundPaymentSchema),
    vendorPaymentController.refundPayment.bind(vendorPaymentController)
);

export default router;
