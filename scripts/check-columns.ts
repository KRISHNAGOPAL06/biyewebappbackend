import { prisma } from '../src/prisma.js';

async function main() {
    // Check if the new columns exist by trying to query them
    try {
        const plans = await prisma.$queryRaw`SELECT id, code, name, price, discount_percent, discount_amount, coupon_code, coupon_valid_until FROM plans LIMIT 1`;
        console.log('✅ New columns exist in database!');
        console.log('Plans:', JSON.stringify(plans, null, 2));
    } catch (error: any) {
        console.error('❌ Column check failed:', error.message);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
