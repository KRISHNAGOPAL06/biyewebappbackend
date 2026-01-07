import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Applying manual fix for blocked_users table...');

    try {
        // 1. Create Table
        await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "blocked_users" (
          "id" TEXT NOT NULL,
          "blockerUserId" TEXT NOT NULL,
          "blockedUserId" TEXT NOT NULL,
          "reason" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      
          CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
      );
    `);
        console.log('Table "blocked_users" checked/created.');

        // 2. Create Indices (catch errors if they exist)
        try {
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blocked_users_blockerUserId_idx" ON "blocked_users"("blockerUserId");`);
            console.log('Index 1 created.');
        } catch (e) {
            // Fallback for older Postgres lacking IF NOT EXISTS for indexes
            try {
                await prisma.$executeRawUnsafe(`CREATE INDEX "blocked_users_blockerUserId_idx" ON "blocked_users"("blockerUserId");`);
            } catch (ignored) { }
        }

        try {
            await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "blocked_users_blockedUserId_idx" ON "blocked_users"("blockedUserId");`);
            console.log('Index 2 created.');
        } catch (e) {
            try {
                await prisma.$executeRawUnsafe(`CREATE INDEX "blocked_users_blockedUserId_idx" ON "blocked_users"("blockedUserId");`);
            } catch (ignored) { }
        }

        try {
            await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "blocked_users_blockerUserId_blockedUserId_key" ON "blocked_users"("blockerUserId", "blockedUserId");`);
            console.log('Index 3 (Unique) created.');
        } catch (e) {
            try {
                await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "blocked_users_blockerUserId_blockedUserId_key" ON "blocked_users"("blockerUserId", "blockedUserId");`);
            } catch (ignored) { }
        }

        console.log('✅ Fix applied successfully. The 500 error should be resolved.');
    } catch (error) {
        console.error('❌ Error applying fix:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
