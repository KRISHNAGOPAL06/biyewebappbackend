
import { Router } from 'express';
import { authenticateVendor } from '../middleware/vendor-auth.middleware.js';
import { VendorOnboardingController } from './vendor-onboarding.controller.js';

const router = Router();

// Public routes (no auth required) - vendors need to see plans before registration
router.get('/plans', VendorOnboardingController.getPlans);

// Apply auth middleware to protected routes
router.use(authenticateVendor);

// Protected plan routes
router.get('/plans/selected', VendorOnboardingController.getSelectedPlan);
router.post('/plans/select', VendorOnboardingController.selectPlan);

// Onboarding Flow
router.get('/status', VendorOnboardingController.getStatus);
router.patch('/profile/step', VendorOnboardingController.updateProfileStep);
router.post('/review/submit', VendorOnboardingController.submitForReview);

// Payment
router.post('/payment/create-checkout', VendorOnboardingController.createStripeCheckout);

export const vendorOnboardingRoutes = router;
