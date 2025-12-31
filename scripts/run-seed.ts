import { seedPlans } from '../src/modules/payments/plan.seed.js';

async function main() {
    console.log('Starting plan seeding...');
    await seedPlans();
    console.log('Plan seeding completed!');
    process.exit(0);
}

main().catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
});
