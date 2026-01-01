/**
 * Seed script for vendor plans
 * Run with: npx tsx scripts/seed-vendor-plans.ts
 */

import { PrismaClient, VendorPlanTier } from '@prisma/client';

const prisma = new PrismaClient();

// Hardcoded vendor plans - features are fixed, only prices editable by admin
const VENDOR_PLANS = [
    {
        name: 'Basic Presence',
        tier: 'BASIC' as VendorPlanTier,
        priceYearly: 4999.00, // BDT
        maxPhotos: 3,
        maxVideos: 0,
        hasAnalytics: false,
        hasPriority: false,
        hasVerifiedBadge: false,
    },
    {
        name: 'Featured Spotlight',
        tier: 'FEATURED' as VendorPlanTier,
        priceYearly: 9999.00, // BDT
        maxPhotos: 10,
        maxVideos: 2,
        hasAnalytics: true,
        hasPriority: true,
        hasVerifiedBadge: false,
    },
    {
        name: 'Premium Showcase',
        tier: 'PREMIUM' as VendorPlanTier,
        priceYearly: 19999.00, // BDT
        maxPhotos: -1, // unlimited
        maxVideos: 5,
        hasAnalytics: true,
        hasPriority: true,
        hasVerifiedBadge: true,
    },
    {
        name: 'Exclusive Elite',
        tier: 'ELITE' as VendorPlanTier,
        priceYearly: 49999.00, // BDT
        maxPhotos: -1, // unlimited
        maxVideos: -1, // unlimited
        hasAnalytics: true,
        hasPriority: true,
        hasVerifiedBadge: true,
    },
];

async function seedVendorPlans() {
    console.log('🌱 Seeding vendor plans...');

    for (const plan of VENDOR_PLANS) {
        const existing = await prisma.vendorPlan.findUnique({
            where: { tier: plan.tier }
        });

        if (existing) {
            // Update existing plan features (price managed separately by admin)
            await prisma.vendorPlan.update({
                where: { tier: plan.tier },
                data: {
                    name: plan.name,
                    maxPhotos: plan.maxPhotos,
                    maxVideos: plan.maxVideos,
                    hasAnalytics: plan.hasAnalytics,
                    hasPriority: plan.hasPriority,
                    hasVerifiedBadge: plan.hasVerifiedBadge,
                }
            });
            console.log(`  ✅ Updated: ${plan.name}`);
        } else {
            // Create new plan with default price
            await prisma.vendorPlan.create({
                data: plan
            });
            console.log(`  ✅ Created: ${plan.name}`);
        }
    }

    // List all plans
    const allPlans = await prisma.vendorPlan.findMany({
        orderBy: { priceYearly: 'asc' }
    });

    console.log('\n📋 All vendor plans:');
    allPlans.forEach(p => {
        const photos = p.maxPhotos === -1 ? 'unlimited' : p.maxPhotos;
        const videos = p.maxVideos === -1 ? 'unlimited' : p.maxVideos;
        console.log(`  - ${p.name} (${p.tier}): ৳${p.priceYearly} | Photos: ${photos} | Videos: ${videos}`);
    });

    console.log('\n✨ Vendor plans seeded successfully!');
}

seedVendorPlans()
    .catch((e) => {
        console.error('Error seeding vendor plans:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
