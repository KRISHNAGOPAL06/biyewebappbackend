
import { prisma } from './src/config/db.js';
import fs from 'fs';

async function main() {
    const log = [];
    try {
        log.push('Fetching Plans (category="vendor")...');
        const plans = await prisma.plan.findMany({
            where: { category: 'vendor' },
            orderBy: { price: 'asc' }
        });
        log.push(`Plans fetched: ${plans.length}`);
    } catch (e: any) {
        log.push('Error fetching Plans:');
        log.push(JSON.stringify({
            message: e.message,
            code: e.code,
            meta: e.meta
        }, null, 2));
    }

    try {
        log.push('Fetching VendorPlans...');
        const vendorPlans = await prisma.vendorPlan.findMany({});
        log.push(`VendorPlans fetched: ${vendorPlans.length}`);
    } catch (e: any) {
        log.push('Error fetching VendorPlans:');
        log.push(JSON.stringify({
            message: e.message,
            code: e.code,
            meta: e.meta
        }, null, 2));
    }

    await prisma.$disconnect();
    fs.writeFileSync('error.log', log.join('\n'));
}

main();
