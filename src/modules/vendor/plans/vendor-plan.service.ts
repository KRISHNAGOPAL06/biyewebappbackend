import { VendorPlan } from '@prisma/client';
import { prisma } from '../../../config/db.js';
import { AppError } from '../../../utils/AppError.js';

export class VendorPlanService {

    /**
     * Get all available vendor plans from the VendorPlan table
     * Transforms the data for frontend compatibility
     */
    async getPlans() {
        const plans = await prisma.vendorPlan.findMany({
            orderBy: { priceYearly: 'asc' }
        });

        // Transform plans to include features array for frontend
        return plans.map(plan => ({
            id: plan.id,
            name: plan.name,
            tier: plan.tier,
            price: Number(plan.priceYearly), // Frontend expects 'price'
            priceYearly: Number(plan.priceYearly),
            durationDays: 365,
            maxPhotos: plan.maxPhotos,
            maxVideos: plan.maxVideos,
            hasAnalytics: plan.hasAnalytics,
            hasPriority: plan.hasPriority,
            hasVerifiedBadge: plan.hasVerifiedBadge,
            // Generate features array from plan properties (hardcoded descriptions)
            features: this.generateFeatures(plan)
        }));
    }

    /**
     * Generate human-readable features array from plan properties
     */
    private generateFeatures(plan: VendorPlan): string[] {
        const features: string[] = [];

        // Photos
        if (plan.maxPhotos === -1) {
            features.push('Unlimited photos');
        } else {
            features.push(`Up to ${plan.maxPhotos} photos`);
        }

        // Videos
        if (plan.maxVideos === -1) {
            features.push('Unlimited videos');
        } else if (plan.maxVideos > 0) {
            features.push(`${plan.maxVideos} video${plan.maxVideos > 1 ? 's' : ''}`);
        }

        // Add logo for all plans
        features.push('Business logo');

        // Analytics
        if (plan.hasAnalytics) {
            features.push('Analytics dashboard');
        } else {
            features.push('Basic insights');
        }

        // Priority placement
        if (plan.hasPriority) {
            features.push('Priority search placement');
        } else {
            features.push('Standard listing');
        }

        // Verified badge
        if (plan.hasVerifiedBadge) {
            features.push('Verified badge');
        }

        // Tier-specific features
        if (plan.tier === 'ELITE') {
            features.push('Top search spot');
            features.push('Category lock');
            features.push('Dedicated support');
        } else if (plan.tier === 'PREMIUM') {
            features.push('Top placement');
        } else if (plan.tier === 'FEATURED') {
            features.push('Highlighted listing');
        }

        return features;
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

