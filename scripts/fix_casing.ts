
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Starting data normalization...');

    // 1. Normalize Gender (lowercase)
    const profiles = await prisma.profile.findMany();
    console.log(`Found ${profiles.length} profiles to check.`);

    let genderUpdates = 0;
    let maritalStatusUpdates = 0;

    for (const p of profiles) {
        const changes: any = {};

        // Check Gender
        if (p.gender && p.gender !== p.gender.toLowerCase()) {
            changes.gender = p.gender.toLowerCase();
            genderUpdates++;
        }

        // Check Marital Status
        if (p.maritalStatus) {
            const normalized = p.maritalStatus.toLowerCase().replace(/ /g, '_');
            if (p.maritalStatus !== normalized) {
                changes.maritalStatus = normalized;
                maritalStatusUpdates++;
            }
        }

        if (Object.keys(changes).length > 0) {
            await prisma.profile.update({
                where: { id: p.id },
                data: changes
            });
            console.log(`Updated profile ${p.id}: ${JSON.stringify(changes)}`);
        }
    }

    console.log(`Normalization complete.`);
    console.log(`Updated ${genderUpdates} profiles for gender.`);
    console.log(`Updated ${maritalStatusUpdates} profiles for marital status.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
