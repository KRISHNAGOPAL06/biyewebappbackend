
import { Request, Response, NextFunction } from 'express';
import { VendorPlanService } from '../plans/vendor-plan.service.js';
import { VendorOnboardingService } from './vendor-onboarding.service.js';
import { sslcommerzGateway } from '../../payments/gateways/sslcommerz.gateway.js';
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
            const vendorId = req.vendorId!;
            const { planId: _planId, successUrl, cancelUrl } = req.body;

            // Get vendor and plan details
            const vendor = await planService.getVendorWithPlan(vendorId);
            if (!vendor || !vendor.plan) {
                throw new AppError('Vendor or plan not found', 404, 'VENDOR_NOT_FOUND');
            }

            // Create SSLCommerz payment session using existing gateway
            const checkoutResult = await sslcommerzGateway.initiatePayment({
                paymentId: `vendor_${vendorId}_${Date.now()}`,
                amount: vendor.plan.price,
                currency: 'BDT',
                planName: vendor.plan.name,
                planCode: vendor.plan.code,
                profileId: vendorId,
                successUrl: successUrl || `${process.env.FRONTEND_URL}/vendor/payment/success`,
                cancelUrl: cancelUrl || `${process.env.FRONTEND_URL}/vendor/payment/cancel`,
                failUrl: cancelUrl || `${process.env.FRONTEND_URL}/vendor/payment/cancel`
            });

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
}
