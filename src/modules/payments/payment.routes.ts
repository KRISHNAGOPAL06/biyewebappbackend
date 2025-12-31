import { Router } from 'express';
import { paymentController } from './payment.controller.js';
import { webhookController } from './webhook.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { checkoutSchema, pauseSubscriptionSchema } from './payment.dto.js';

const router = Router();

router.get('/plans', paymentController.getPlans.bind(paymentController));
router.get('/plans/:code', paymentController.getPlanByCode.bind(paymentController));

// Coupon validation
router.post('/coupons/validate', paymentController.validateCoupon.bind(paymentController));

router.post(
  '/subscriptions/checkout',
  authenticateToken,
  validate(checkoutSchema),
  paymentController.checkout.bind(paymentController)
);

// Get current user's active subscription
router.get(
  '/subscription/active',
  authenticateToken,
  paymentController.getMyActiveSubscription.bind(paymentController)
);

router.get(
  '/subscriptions/:profileId',
  authenticateToken,
  paymentController.getActiveSubscription.bind(paymentController)
);

router.get(
  '/subscriptions/:profileId/history',
  authenticateToken,
  paymentController.getSubscriptionHistory.bind(paymentController)
);

router.post(
  '/subscriptions/:profileId/pause',
  authenticateToken,
  validate(pauseSubscriptionSchema),
  paymentController.pauseSubscription.bind(paymentController)
);

router.post(
  '/subscriptions/:profileId/resume',
  authenticateToken,
  paymentController.resumeSubscription.bind(paymentController)
);

router.post(
  '/subscriptions/:profileId/cancel',
  authenticateToken,
  paymentController.cancelSubscription.bind(paymentController)
);

router.get(
  '/payments/:profileId/history',
  authenticateToken,
  paymentController.getPaymentHistory.bind(paymentController)
);

router.get(
  '/entitlements/:profileId/usage',
  authenticateToken,
  paymentController.getUsageStats.bind(paymentController)
);

router.post(
  '/entitlements/:profileId/check',
  authenticateToken,
  paymentController.checkEntitlement.bind(paymentController)
);

// router.get('/callback/:status', paymentController.handlePaymentCallback.bind(paymentController));

router.all(
  '/callback/:status',
  paymentController.handlePaymentCallback.bind(paymentController)
);
router.post('/webhooks/sslcommerz', webhookController.handleSSLCommerz.bind(webhookController));
router.post('/webhooks/stripe', webhookController.handleStripe.bind(webhookController));
router.post('/webhooks/bkash', webhookController.handleBkash.bind(webhookController));
router.post('/webhooks/applepay', webhookController.handleApplePay.bind(webhookController));
router.post('/webhooks/visa-mastercard', webhookController.handleVisaMastercard.bind(webhookController));

export default router;
