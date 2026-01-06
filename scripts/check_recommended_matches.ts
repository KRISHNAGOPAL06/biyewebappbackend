import { prisma } from '../src/prisma.js';

async function checkRecommendedMatches() {
    console.log('🎯 Checking Recommended Matches Data...\n');

    try {
        // 1. Get a sample user to test recommendations for
        const sampleUser = await prisma.user.findFirst({
            where: {
                role: { in: ['self', 'candidate'] },
            },
            select: {
                id: true,
                lookingFor: true,
            },
        });

        if (!sampleUser) {
            console.log('❌ No users found');
            return;
        }

        console.log(`👤 Testing recommendations for user: ${sampleUser.id}`);
        console.log(`🔍 Looking for: ${sampleUser.lookingFor}\n`);

        // 2. Get the user's profile
        const userProfile = await prisma.profile.findUnique({
            where: { userId: sampleUser.id },
            select: {
                id: true,
                userId: true,
                registeredUserId: true,
                gender: true,
                dob: true,
                prefAgeRangeFrom: true,
                prefAgeRangeTo: true,
                prefHeightFrom: true,
                prefHeightTo: true,
                prefReligion: true,
                prefMaritalStatus: true,
            },
        });

        if (!userProfile) {
            console.log('❌ No profile found for user');
            return;
        }

        console.log(`📋 User Profile: ${userProfile.registeredUserId}`);
        console.log(`   Gender: ${userProfile.gender}`);
        console.log(`   Preferences:`);
        console.log(`   - Age: ${userProfile.prefAgeRangeFrom || 'any'} - ${userProfile.prefAgeRangeTo || 'any'}`);
        console.log(`   - Height: ${userProfile.prefHeightFrom || 'any'} - ${userProfile.prefHeightTo || 'any'}`);
        console.log(`   - Religion: ${userProfile.prefReligion || 'any'}`);
        console.log(`   - Marital Status: ${userProfile.prefMaritalStatus || 'any'}\n`);

        // 3. Determine required gender based on lookingFor
        const requiredGender =
            sampleUser.lookingFor === 'bride' ? 'female' :
                sampleUser.lookingFor === 'groom' ? 'male' :
                    undefined;

        console.log(`🎯 Required gender: ${requiredGender || 'any'}\n`);

        // 4. Count total published profiles (excluding self)
        const totalProfiles = await prisma.profile.count({
            where: {
                published: true,
                deletedAt: null,
                userId: { not: sampleUser.id },
            },
        });

        console.log(`📊 Total published profiles (excluding self): ${totalProfiles}`);

        // 5. Count profiles matching gender requirement
        const genderMatchCount = await prisma.profile.count({
            where: {
                published: true,
                deletedAt: null,
                userId: { not: sampleUser.id },
                ...(requiredGender ? { gender: { equals: requiredGender, mode: 'insensitive' } } : {}),
            },
        });

        console.log(`👥 Profiles matching gender (${requiredGender || 'any'}): ${genderMatchCount}`);

        // 6. Build query with all preference filters (simulating backend logic)
        const baseQuery: any = {
            published: true,
            deletedAt: null,
            userId: { not: sampleUser.id },
        };

        if (requiredGender) {
            baseQuery.gender = { equals: requiredGender, mode: 'insensitive' };
        }

        // Age filter
        if (userProfile.prefAgeRangeFrom || userProfile.prefAgeRangeTo) {
            const now = new Date();
            baseQuery.dob = {};
            if (userProfile.prefAgeRangeFrom) {
                const maxDate = new Date(now);
                maxDate.setFullYear(maxDate.getFullYear() - userProfile.prefAgeRangeFrom);
                baseQuery.dob.lte = maxDate;
            }
            if (userProfile.prefAgeRangeTo) {
                const minDate = new Date(now);
                minDate.setFullYear(minDate.getFullYear() - userProfile.prefAgeRangeTo);
                baseQuery.dob.gte = minDate;
            }
        }

        // Height filter
        if (userProfile.prefHeightFrom || userProfile.prefHeightTo) {
            baseQuery.height = {};
            if (userProfile.prefHeightFrom) baseQuery.height.gte = userProfile.prefHeightFrom;
            if (userProfile.prefHeightTo) baseQuery.height.lte = userProfile.prefHeightTo;
        }

        // Religion filter
        if (userProfile.prefReligion) {
            baseQuery.religion = { equals: userProfile.prefReligion, mode: 'insensitive' };
        }

        // Marital status filter
        if (userProfile.prefMaritalStatus) {
            baseQuery.maritalStatus = { equals: userProfile.prefMaritalStatus, mode: 'insensitive' };
        }

        console.log(`\n🔍 Query filters:`, JSON.stringify(baseQuery, null, 2));

        // 7. Get matching profiles
        const matchingProfiles = await prisma.profile.findMany({
            where: baseQuery,
            take: 10,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: {
                id: true,
                registeredUserId: true,
                gender: true,
                dob: true,
                height: true,
                religion: true,
                maritalStatus: true,
            },
        });

        console.log(`\n✅ Matching profiles (with all filters): ${matchingProfiles.length}`);

        if (matchingProfiles.length > 0) {
            console.log(`\n📋 Sample matching profiles:`);
            matchingProfiles.slice(0, 5).forEach((p, i) => {
                const age = p.dob ? Math.floor((Date.now() - new Date(p.dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A';
                console.log(`   ${i + 1}. ${p.registeredUserId} - ${p.gender}, Age: ${age}, Height: ${p.height || 'N/A'}, Religion: ${p.religion || 'N/A'}`);
            });
        } else {
            console.log(`\n⚠️  No profiles match the preference filters!`);
            console.log(`   Try relaxing some preferences to get recommendations.`);
        }

        console.log(`\n💡 Summary:`);
        console.log(`   - Total profiles: ${totalProfiles}`);
        console.log(`   - Gender matches: ${genderMatchCount}`);
        console.log(`   - After all filters: ${matchingProfiles.length}`);
        console.log(`\n✅ Check complete!`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkRecommendedMatches();
