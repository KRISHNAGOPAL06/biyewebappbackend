import { seedPlans } from './src/modules/payments/plan.seed';
import { seedVendorPlans } from './src/modules/vendor/plans/vendor-plan.seed';

async function runSeeds() {
    try {
        await seedPlans();
        await seedVendorPlans();

        console.log('All seeds completed successfully!');
        process.exit(0);
    } catch (e) {
        console.error('Error seeding:', e);
        process.exit(1);
    }
}

runSeeds();
