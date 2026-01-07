
import { Request, Response, NextFunction } from 'express';
import { VendorPlanService } from '../plans/vendor-plan.service.js';
import { VendorOnboardingService } from './vendor-onboarding.service.js';
import { sslcommerzGateway } from '../../payments/gateways/sslcommerz.gateway.js';
import { stripeGateway } from '../../payments/gateways/stripe.gateway.js';
import { AppError } from '../../../utils/AppError.js';
import { VendorPlanSelectionSchema, VendorProfileUpdateSchema } from '../vendor.dto.js';

const planService = new VendorPlanService();
const onboardingService = new VendorOnboardingService();

export class VendorOnboardingController {

    // --- Plans ---

    static async getPlans(_req: Request, res: Response, next: NextFunction) {
        try {
            const plans = await planService.getPlans();
            res.json({
                success: true,
                data: plans
            });
        } catch (error) {
            next(error);
        }
    }

    static async selectPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const { planId } = VendorPlanSelectionSchema.parse(req.body);
            const vendorId = req.vendorId!;

            const vendor = await planService.selectPlan(vendorId, planId);

            res.json({
                success: true,
                message: 'Plan selected successfully',
                data: {
                    vendorId: vendor.id,
                    planId: vendor.planId,
                    status: vendor.onboardingStatus
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // --- Onboarding Flow ---

    static async getStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const status = await onboardingService.getOnboardingStatus(req.vendorId!);
            res.json({
                success: true,
                data: status
            });
        } catch (error) {
            next(error);
        }
    }

    static async updateProfileStep(req: Request, res: Response, next: NextFunction) {
        try {
            // We use the partial update schema
            const data = VendorProfileUpdateSchema.parse(req.body);
            const vendorId = req.vendorId!;

            const updatedProfile = await onboardingService.updateProfileStep(vendorId, data);

            res.json({
                success: true,
                message: 'Profile updated',
                data: updatedProfile
            });
        } catch (error) {
            next(error);
        }
    }

    static async submitForReview(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId!;
            const vendor = await onboardingService.submitForReview(vendorId);

            res.json({
                success: true,
                message: 'Submitted for review',
                data: {
                    status: vendor.onboardingStatus
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // --- Step Progress Tracking ---

    static async getProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId!;
            const progress = await onboardingService.getProgress(vendorId);

            res.json({
                success: true,
                data: progress
            });
        } catch (error) {
            next(error);
        }
    }

    static async saveStep(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId!;
            const stepNumber = parseInt(req.params.stepNumber, 10);
            const stepData = req.body;

            if (isNaN(stepNumber) || stepNumber < 1) {
                throw new AppError('Invalid step number', 400, 'INVALID_STEP_NUMBER');
            }

            const result = await onboardingService.saveStep(vendorId, stepNumber, stepData);

            res.json({
                success: true,
                message: `Step ${stepNumber} saved successfully`,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    static async completeOnboarding(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId!;
            const result = await onboardingService.completeOnboarding(vendorId);

            res.json({
                success: true,
                message: result.message,
                data: {
                    onboardingStatus: result.onboardingStatus
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // --- Payment ---

    static async getSelectedPlan(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId!;
            const plan = await planService.getVendorSelectedPlan(vendorId);

            if (!plan) {
                throw new AppError('No plan selected', 404, 'NO_PLAN_SELECTED');
            }

            res.json({
                success: true,
                data: plan
            });
        } catch (error) {
            next(error);
        }
    }

    static async createStripeCheckout(req: Request, res: Response, next: NextFunction) {
        try {
            console.log('[DEBUG] createStripeCheckout req.body:', JSON.stringify(req.body));

            const vendorId = req.vendorId!;
            // Accept multiple specific field names to be robust against frontend changes
            const { planId: _planId, successUrl, cancelUrl, couponCode, paymentGateway = 'sslcommerz', targetCurrency, currency, currencyCode, exchangeRate = 1 } = req.body;

            const finalCurrency = targetCurrency || currency || currencyCode || 'USD';
            console.log(`[DEBUG] Extracted: finalCurrency=${finalCurrency}, exchangeRate=${exchangeRate}, paymentGateway=${paymentGateway}`);

            // Get vendor and plan details (already has sale discount applied)
            const vendor = await planService.getVendorWithPlan(vendorId);
            if (!vendor || !vendor.plan) {
                throw new AppError('Vendor or plan not found', 404, 'VENDOR_NOT_FOUND');
            }

            // Calculate base amount in target currency
            // Plan price is stored in BDT. We convert it to the user's currency.
            // Plan price is stored in BDT. We convert it to the user's currency.
            const rate = Number(exchangeRate);
            let finalAmount = Math.ceil(vendor.plan.price * rate);

            // Apply coupon discount if provided
            if (couponCode) {
                const couponResult = await planService.validateCoupon(couponCode, vendor.planId!);
                if (couponResult.valid && couponResult.discountPercent) {
                    const couponDiscount = finalAmount * (couponResult.discountPercent / 100);
                    finalAmount = Math.max(0, finalAmount - couponDiscount);
                    console.log('[Payment] Coupon applied:', couponCode, 'Discount:', couponDiscount, 'Final:', finalAmount);
                }
            }

            console.log('[Payment] Final payment amount:', finalAmount, 'Currency:', targetCurrency, 'Gateway:', paymentGateway);

            let checkoutResult;

            // Use Stripe gateway
            if (paymentGateway === 'stripe') {
                checkoutResult = await stripeGateway.initiatePayment({
                    paymentId: `vendor_${vendorId}_${Date.now()}`,
                    amount: finalAmount,
                    currency: finalCurrency, // Dynamic currency from frontend (robust check)
                    planName: vendor.plan.name,
                    planCode: vendor.plan.code,
                    profileId: vendorId,
                    successUrl: successUrl || `${process.env.FRONTEND_URL}/vendor/payment/success`,
                    cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/vendor/payment/cancel`,
                    failUrl: cancelUrl || `${process.env.FRONTEND_URL}/vendor/payment/cancel`
                });
            } else {
                // Default to SSLCommerz gateway
                checkoutResult = await sslcommerzGateway.initiatePayment({
                    paymentId: `vendor_${vendorId}_${Date.now()}`,
                    amount: finalAmount,
                    currency: 'BDT',
                    planName: vendor.plan.name,
                    planCode: vendor.plan.code,
                    profileId: vendorId,
                    successUrl: successUrl || `${process.env.FRONTEND_URL}/vendor/payment/success`,
                    cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/vendor/payment/cancel`,
                    failUrl: cancelUrl || `${process.env.FRONTEND_URL}/vendor/payment/cancel`
                });
            }

            if (!checkoutResult.success) {
                throw new AppError(checkoutResult.error || 'Failed to create checkout session', 500, 'PAYMENT_ERROR');
            }

            res.json({
                success: true,
                data: {
                    paymentUrl: checkoutResult.paymentUrl,
                    sessionId: checkoutResult.gatewayTxnId
                }
            });
        } catch (error) {
            next(error);
        }
    }

    // --- Coupon Validation ---
    static async validateCoupon(req: Request, res: Response, next: NextFunction) {
        try {
            const { code, planId } = req.body;

            if (!code || !planId) {
                throw new AppError('Coupon code and plan ID are required', 400, 'INVALID_REQUEST');
            }

            // Validate coupon against plan data from admin
            const result = await planService.validateCoupon(code, planId);

            if (result.valid) {
                res.json({
                    success: true,
                    data: {
                        discountPercent: result.discountPercent,
                        code: result.code
                    }
                });
            } else {
                res.json({
                    success: false,
                    error: { message: result.message || 'Invalid coupon code' }
                });
            }
        } catch (error) {
            next(error);
        }
    }
}
