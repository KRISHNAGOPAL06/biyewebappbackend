import { prisma } from './src/prisma.js';

async function main() {
    try {
        console.log('Checking Report table...');
        const count = await prisma.report.count();
        console.log(`Report table exists. Count: ${count}`);
    } catch (e: any) {
        console.error('Error checking Report table:', e.message);
        if (e.code === 'P2021') {
            console.log('Table does not exist!');
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
