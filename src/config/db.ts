import { PrismaClient } from '@prisma/client';

// Singleton pattern to prevent connection pool exhaustion during hot reload
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
    log: ['error', 'warn'],
    // Limit connection pool to prevent exhaustion
    datasources: {
        db: {
            url: process.env.DATABASE_URL + '?connection_limit=5&pool_timeout=10'
        }
    }
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;