import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { vendorAuthController } from './vendor-auth.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateVendor } from '../middleware/vendor-auth.middleware.js';
import {
    VendorRegisterSchema,
    VendorVerifyOTPSchema,
    VendorLoginSchema,
    VendorForgotPasswordSchema,
    VendorResetPasswordSchema,
} from '../vendor.dto.js';

const router = Router();

// Rate limiters
const registrationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Increased for testing (was 5)
    message: 'Too many registration attempts. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes (reduced for testing)
    max: 100, // Increased for testing
    message: 'Too many authentication attempts. Please try again after 5 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Public routes
router.post(
    '/register',
    // registrationLimiter, // TEMPORARILY DISABLED FOR DEVELOPMENT
    validate(VendorRegisterSchema),
    vendorAuthController.register.bind(vendorAuthController)
);

router.post(
    '/verify',
    otpLimiter,
    validate(VendorVerifyOTPSchema),
    vendorAuthController.verify.bind(vendorAuthController)
);

router.post(
    '/login',
    authLimiter,
    validate(VendorLoginSchema),
    vendorAuthController.login.bind(vendorAuthController)
);

router.post(
    '/verify-login',
    otpLimiter,
    validate(VendorVerifyOTPSchema),
    vendorAuthController.verifyLoginOTP.bind(vendorAuthController)
);

router.post(
    '/resend-otp',
    otpLimiter,
    vendorAuthController.resendOTP.bind(vendorAuthController)
);

router.post(
    '/refresh',
    authLimiter,
    vendorAuthController.refresh.bind(vendorAuthController)
);

router.post(
    '/forgot-password',
    otpLimiter,
    validate(VendorForgotPasswordSchema),
    vendorAuthController.forgotPassword.bind(vendorAuthController)
);

router.post(
    '/reset-password',
    authLimiter,
    validate(VendorResetPasswordSchema),
    vendorAuthController.resetPassword.bind(vendorAuthController)
);

// Protected routes (require vendor authentication)
router.post(
    '/logout',
    authenticateVendor,
    vendorAuthController.logout.bind(vendorAuthController)
);

router.post(
    '/logout-all',
    authenticateVendor,
    vendorAuthController.logoutAll.bind(vendorAuthController)
);

router.get(
    '/me',
    authenticateVendor,
    vendorAuthController.me.bind(vendorAuthController)
);

router.get(
    '/sessions',
    authenticateVendor,
    vendorAuthController.getSessions.bind(vendorAuthController)
);

router.delete(
    '/sessions/:sessionId',
    authenticateVendor,
    vendorAuthController.revokeSession.bind(vendorAuthController)
);

export default router;
