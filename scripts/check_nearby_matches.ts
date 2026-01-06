import { prisma } from '../src/prisma.js';

async function checkNearbyMatches() {
    console.log('🔍 Checking Nearby Matches Data...\n');

    try {
        // 1. Get a sample user profile with location
        const sampleProfile = await prisma.profile.findFirst({
            where: {
                location: { not: null },
                published: true,
                deletedAt: null,
            },
            select: {
                id: true,
                userId: true,
                registeredUserId: true,
                location: true,
                gender: true,
            },
        });

        if (!sampleProfile) {
            console.log('❌ No profiles with location found');
            return;
        }

        console.log('📍 Sample Profile:');
        console.log(`   ID: ${sampleProfile.id}`);
        console.log(`   User: ${sampleProfile.registeredUserId}`);
        console.log(`   Gender: ${sampleProfile.gender}`);
        console.log(`   Location:`, sampleProfile.location);

        const userState = (sampleProfile.location as any)?.state;
        const userCountry = (sampleProfile.location as any)?.country;
        const userCity = (sampleProfile.location as any)?.city;

        console.log(`\n🗺️  User State: ${userState}`);
        console.log(`🌍 User Country: ${userCountry}`);
        console.log(`🏙️  User City: ${userCity || 'N/A (not in location structure)'}\n`);

        // 2. Count total profiles
        const totalProfiles = await prisma.profile.count({
            where: {
                published: true,
                deletedAt: null,
                userId: { not: sampleProfile.userId },
            },
        });

        console.log(`📊 Total published profiles (excluding self): ${totalProfiles}`);

        // 3. Get all profiles and filter by state (simulating the backend logic)
        const allProfiles = await prisma.profile.findMany({
            where: {
                published: true,
                deletedAt: null,
                userId: { not: sampleProfile.userId },
                location: { not: null },
            },
            select: {
                id: true,
                registeredUserId: true,
                location: true,
                gender: true,
            },
        });

        const sameStateProfiles = allProfiles.filter((profile: any) => {
            const profileState = (profile.location as any)?.state;
            return profileState === userState;
        });

        console.log(`📍 Profiles in same state (${userState}): ${sameStateProfiles.length}`);

        // 4. Show sample profiles from same state
        console.log(`\n✅ Sample profiles from same state:`);
        sameStateProfiles.slice(0, 5).forEach((p, i) => {
            const state = (p.location as any)?.state;
            const city = (p.location as any)?.city;
            console.log(`   ${i + 1}. ${p.registeredUserId} - State: ${state}, City: ${city || 'N/A'}, Gender: ${p.gender}`);
        });

        // 5. Show location structure samples
        const locationSamples = await prisma.profile.findMany({
            where: {
                location: { not: null },
                deletedAt: null,
            },
            take: 5,
            select: {
                registeredUserId: true,
                location: true,
            },
        });

        console.log(`\n📋 Location structure samples:`);
        locationSamples.forEach((p, i) => {
            console.log(`   ${i + 1}. ${p.registeredUserId}:`, JSON.stringify(p.location));
        });

        console.log('\n✅ Check complete!');
        console.log(`\n💡 Summary:`);
        console.log(`   - Total profiles: ${totalProfiles}`);
        console.log(`   - Nearby matches (same state): ${sameStateProfiles.length}`);
        console.log(`   - Location structure: ${userCity ? 'Has city field (old)' : 'State-only (new)'}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkNearbyMatches();
