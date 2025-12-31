import { VendorPlan } from '@prisma/client';
import { prisma } from '../../../prisma.js';
import { AppError } from '../../../utils/AppError.js';

export class VendorPlanService {

    /**
     * Get all available vendor plans from the VendorPlan table
     */
    async getPlans(): Promise<VendorPlan[]> {
        return await prisma.vendorPlan.findMany({
            orderBy: { priceYearly: 'asc' }
        });
    }

    /**
     * Get a specific plan by ID
     */
    async getPlanById(planId: string): Promise<VendorPlan | null> {
        return await prisma.vendorPlan.findUnique({
            where: { id: planId }
        });
    }

    /**
     * Select a plan for a vendor
     * This updates the vendor's planId and moves onboarding status forward
     */
    async selectPlan(vendorId: string, planId: string) {
        const plan = await this.getPlanById(planId);
        if (!plan) {
            throw new AppError('Invalid plan selected', 400, 'INVALID_PLAN');
        }

        // Update vendor - default to 365 days for now as it's yearly
        const durationDays = 365;
        const vendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                planId: plan.id,
                onboardingStatus: 'PLAN_SELECTED',
                subscriptionExpiry: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
            }
        });

        // Create a subscription record
        await prisma.vendorSubscription.create({
            data: {
                vendorId: vendor.id,
                planId: plan.id,
                pricePaid: plan.priceYearly,
                currency: 'BDT',
                startAt: new Date(),
                endAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
                isActive: true
            }
        });

        return vendor;
    }

    /**
     * Get vendor's selected plan
     */
    async getVendorSelectedPlan(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId }
        });

        if (!vendor || !vendor.planId) {
            return null;
        }

        // Get the plan from VendorPlan table
        return await prisma.vendorPlan.findUnique({
            where: { id: vendor.planId }
        });
    }

    /**
     * Get vendor with plan details for payment
     */
    async getVendorWithPlan(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId }
        });

        if (!vendor || !vendor.planId) {
            return null;
        }

        const plan = await prisma.vendorPlan.findUnique({
            where: { id: vendor.planId }
        });

        // Normalize plan object for payment gateway
        return {
            ...vendor,
            plan: plan ? {
                ...plan,
                price: Number(plan.priceYearly),
                code: plan.tier, // Use tier as code
                durationDays: 365
            } : null
        };
    }
}

