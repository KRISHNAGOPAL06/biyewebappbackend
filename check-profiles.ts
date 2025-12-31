import { prisma } from './src/prisma.js';
import { writeFileSync } from 'fs';

async function checkProfiles() {
    const profiles = await prisma.profile.findMany({
        include: {
            user: {
                select: { lookingFor: true, email: true }
            }
        }
    });

    let output = '';
    output += '========================================\n';
    output += `TOTAL PROFILES: ${profiles.length}\n`;
    output += '========================================\n\n';

    for (let i = 0; i < profiles.length; i++) {
        const p = profiles[i];
        output += `--- PROFILE ${i + 1} ---\n`;
        output += `ID:          ${p.id}\n`;
        output += `Email:       ${p.user?.email || 'N/A'}\n`;
        output += `Published:   ${p.published}\n`;
        output += `Gender:      ${p.gender || 'NOT SET'}\n`;
        output += `LookingFor:  ${p.user?.lookingFor || 'NOT SET'}\n`;
        output += `DeletedAt:   ${p.deletedAt || 'null'}\n`;
        output += '\n';
    }

    // Check matching compatibility
    output += '========================================\n';
    output += 'MATCHING ANALYSIS\n';
    output += '========================================\n';

    const publishedProfiles = profiles.filter(p => p.published && !p.deletedAt);
    output += `Published profiles: ${publishedProfiles.length}\n`;

    for (const p of publishedProfiles) {
        const lookingFor = p.user?.lookingFor;
        const requiredGender = lookingFor === 'bride' ? 'female' : lookingFor === 'groom' ? 'male' : null;

        output += `\n${p.user?.email}:\n`;
        output += `  - Is ${p.gender}, looking for ${lookingFor} (${requiredGender})\n`;

        // Count potential matches
        const potentialMatches = publishedProfiles.filter(other =>
            other.id !== p.id &&
            other.gender?.toLowerCase() === requiredGender
        );

        output += `  - Potential matches: ${potentialMatches.length}\n`;
        potentialMatches.forEach(m => {
            output += `    * ${m.user?.email} (${m.gender})\n`;
        });
    }

    writeFileSync('profile-check.txt', output);
    console.log('Output written to profile-check.txt');

    await prisma.$disconnect();
}

checkProfiles().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
});
