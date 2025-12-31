
import { VendorPlanTier } from '@prisma/client';
import { prisma } from '../../../prisma.js';

interface VendorPlanSeed {
    name: string;
    tier: VendorPlanTier;
    priceYearly: number;
    maxPhotos: number;
    maxVideos: number;
    hasAnalytics: boolean;
    hasPriority: boolean;
    hasVerifiedBadge: boolean;
}

const vendorPlans: VendorPlanSeed[] = [
    {
        name: 'Basic Presence',
        tier: 'BASIC',
        priceYearly: 0,
        maxPhotos: 5,
        maxVideos: 0,
        hasAnalytics: false,
        hasPriority: false,
        hasVerifiedBadge: false
    },
    {
        name: 'Featured Vendor',
        tier: 'FEATURED',
        priceYearly: 4999,
        maxPhotos: 15,
        maxVideos: 1,
        hasAnalytics: true,
        hasPriority: false,
        hasVerifiedBadge: true
    },
    {
        name: 'Premium Partner',
        tier: 'PREMIUM',
        priceYearly: 9999,
        maxPhotos: 30,
        maxVideos: 3,
        hasAnalytics: true,
        hasPriority: true,
        hasVerifiedBadge: true
    },
    {
        name: 'Elite Showcase',
        tier: 'ELITE',
        priceYearly: 19999,
        maxPhotos: 50,
        maxVideos: 5,
        hasAnalytics: true,
        hasPriority: true,
        hasVerifiedBadge: true
    }
];

export async function seedVendorPlans() {
    console.log('Seeding vendor plans...');

    for (const plan of vendorPlans) {
        await prisma.vendorPlan.upsert({
            where: { tier: plan.tier },
            update: {
                name: plan.name,
                priceYearly: plan.priceYearly,
                maxPhotos: plan.maxPhotos,
                maxVideos: plan.maxVideos,
                hasAnalytics: plan.hasAnalytics,
                hasPriority: plan.hasPriority,
                hasVerifiedBadge: plan.hasVerifiedBadge
            },
            create: {
                name: plan.name,
                tier: plan.tier,
                priceYearly: plan.priceYearly,
                maxPhotos: plan.maxPhotos,
                maxVideos: plan.maxVideos,
                hasAnalytics: plan.hasAnalytics,
                hasPriority: plan.hasPriority,
                hasVerifiedBadge: plan.hasVerifiedBadge
            }
        });
        console.log(`  - ${plan.name} (${plan.tier}) seeded`);
    }

    console.log('Vendor plans seeded successfully!');
}
