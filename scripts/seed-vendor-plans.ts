
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const vendorPlans = [
    {
        code: 'VENDOR_BASIC',
        name: 'Basic Presence',
        price: 999,
        durationDays: 365,
        category: 'vendor',
        isInviteOnly: false,
        features: ['3 photos', 'Basic analytics', 'Standard listing']
    },
    {
        code: 'VENDOR_FEATURED',
        name: 'Featured Spotlight',
        price: 2499,
        durationDays: 365,
        category: 'vendor',
        isInviteOnly: false,
        features: ['10 photos', '1 video', 'Priority support', 'Highlight badge']
    },
    {
        code: 'VENDOR_PREMIUM',
        name: 'Premium Showcase',
        price: 4999,
        durationDays: 365,
        category: 'vendor',
        isInviteOnly: false,
        features: ['Unlimited photos', '5 videos', 'Top placement', 'Verified badge', 'Analytics dashboard']
    },
    {
        code: 'VENDOR_ELITE',
        name: 'Exclusive Elite',
        price: 9999,
        durationDays: 365,
        category: 'vendor',
        isInviteOnly: true,
        features: ['All features', 'Dedicated support', 'Category lock', 'Custom branding']
    }
];

async function seed() {
    console.log('Creating vendor plans in Plan model...');
    for (const plan of vendorPlans) {
        const existing = await prisma.plan.findUnique({ where: { code: plan.code } });
        if (!existing) {
            await prisma.plan.create({ data: plan });
            console.log('Created:', plan.name);
        } else {
            console.log('Already exists:', plan.name);
            // Optional: Update if exists to ensure consistency
            await prisma.plan.update({
                where: { code: plan.code },
                data: plan
            });
            console.log('Updated:', plan.name);
        }
    }
    console.log('Vendor plans seeding complete!');
}

seed()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
