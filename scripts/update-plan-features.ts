/**
 * Script to update Plan features in the database
 * Run with: npx tsx scripts/update-plan-features.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const planFeatures = {
    ALAAP: {
        photos: 3,
        video: false,
        messaging: false, // Only icebreakers allowed - NO direct messaging
        icebreakersPerMonth: 5,
        parentIcebreakers: 5,
        filters: ['age', 'religion', 'country'],
        verification: 'selfie',
        stealth: false,
        boosts: 0,
        spotlight: 0,
        spotlightDays: 0,
        aiIntroductions: 0,
        familyMessaging: false,
        signatureFeed: false,
        pauseAllowed: false,
        videoCalling: false,
        tierVisibility: ['ALAAP', 'JATRA'],
    },
    JATRA: {
        photos: 6,
        video: false,
        messaging: {
            newChatsPerMonth: 5,  // 5 new conversations per month
            messagesPerChat: 10,   // 10 messages per conversation
        },
        boosts: 1,
        spotlight: 1,
        spotlightDays: 1,
        filters: ['age', 'religion', 'country', 'education', 'profession', 'lifestyle', 'migrationIntent'],
        verification: 'selfie',
        stealth: false,
        icebreakersPerMonth: 0,
        parentIcebreakers: 0,
        aiIntroductions: 0,
        familyMessaging: true,
        signatureFeed: false,
        pauseAllowed: false,
        videoCalling: false,
        tierVisibility: ['ALAAP', 'JATRA'],
        canRequestAalok: true,
    },
    AALOK: {
        photos: 9,
        video: true,
        messaging: 'unlimited', // Unlimited conversations and messages
        stealth: true,
        spotlightDays: 3,
        pauseAllowed: true,
        verification: 'selfie',
        boosts: 5,
        spotlight: 3,
        icebreakersPerMonth: 0,
        parentIcebreakers: 0,
        filters: ['age', 'religion', 'country', 'education', 'profession', 'lifestyle', 'migrationIntent', 'income', 'family'],
        aiIntroductions: 3,
        familyMessaging: true,
        signatureFeed: false,
        founderConsult: false,
        videoCalling: false,
        tierVisibility: ['ALAAP', 'JATRA', 'AALOK'],
        visibilityControl: true,
    },
    OBHIJAAT: {
        photos: 12,
        video: true,
        videoIntroSeconds: 45,
        messaging: 'unlimited', // All features unlocked
        signatureFeed: true,
        founderConsult: true,
        aiIntroductions: 5,
        familyMessaging: true,
        stealth: true,
        pauseAllowed: true,
        verification: 'gold',
        boosts: 10,
        spotlight: 5,
        spotlightDays: 7,
        icebreakersPerMonth: 0,
        parentIcebreakers: 0,
        filters: ['age', 'religion', 'country', 'education', 'profession', 'lifestyle', 'migrationIntent', 'income', 'family', 'premium'],
        videoCalling: true,
        signatureBadge: true,
        tierVisibility: ['ALAAP', 'JATRA', 'AALOK', 'OBHIJAAT'],
        visibilityControl: true,
        founderEvents: true,
    },
};

async function updatePlanFeatures() {
    console.log('🔄 Updating Plan features in database...\n');

    for (const [code, features] of Object.entries(planFeatures)) {
        try {
            const result = await prisma.plan.update({
                where: { code },
                data: { features: features as any },
            });
            console.log(`✅ ${code}: Updated successfully`);
            console.log(`   messaging: ${JSON.stringify(result.features?.messaging)}\n`);
        } catch (error: any) {
            if (error.code === 'P2025') {
                // Plan doesn't exist, create it
                console.log(`⚠️  ${code}: Not found, creating...`);
                await prisma.plan.create({
                    data: {
                        code,
                        name: code.charAt(0) + code.slice(1).toLowerCase(),
                        price: code === 'ALAAP' ? 999 : code === 'JATRA' ? 2999 : code === 'AALOK' ? 5999 : 14999,
                        durationDays: 30,
                        isInviteOnly: code === 'OBHIJAAT',
                        category: 'subscription',
                        features: features as any,
                    },
                });
                console.log(`✅ ${code}: Created successfully\n`);
            } else {
                console.error(`❌ ${code}: Error - ${error.message}`);
            }
        }
    }

    // Verify the updates
    console.log('\n📋 Verifying Plan features:\n');
    const plans = await prisma.plan.findMany({
        select: { code: true, name: true, features: true },
        orderBy: { price: 'asc' },
    });

    for (const plan of plans) {
        const features = plan.features as any;
        console.log(`${plan.code} (${plan.name}):`);
        console.log(`  messaging: ${JSON.stringify(features?.messaging)}`);
        console.log('');
    }

    console.log('✅ Done!');
}

updatePlanFeatures()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
