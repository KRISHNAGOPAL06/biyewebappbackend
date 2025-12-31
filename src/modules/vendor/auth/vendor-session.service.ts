import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface VendorSessionInfo {
    deviceId?: string;
    ip?: string;
    userAgent?: string;
}

class VendorSessionService {
    /**
     * Create a new vendor session
     */
    async createSession(vendorId: string, info: VendorSessionInfo): Promise<string> {
        const session = await prisma.vendorSession.create({
            data: {
                vendorId,
                deviceId: info.deviceId,
                ip: info.ip,
                userAgent: info.userAgent,
            },
        });

        return session.id;
    }

    /**
     * Check if a session is valid (exists and not revoked)
     */
    async isSessionValid(sessionId: string): Promise<boolean> {
        const session = await prisma.vendorSession.findUnique({
            where: { id: sessionId },
        });

        return session !== null && !session.revoked;
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(sessionId: string): Promise<void> {
        await prisma.vendorSession.update({
            where: { id: sessionId },
            data: { revoked: true },
        });
    }

    /**
     * Revoke all sessions for a vendor
     */
    async revokeAllSessions(vendorId: string): Promise<void> {
        await prisma.vendorSession.updateMany({
            where: { vendorId },
            data: { revoked: true },
        });
    }

    /**
     * Update session activity timestamp
     */
    async updateSessionActivity(sessionId: string): Promise<void> {
        await prisma.vendorSession.update({
            where: { id: sessionId },
            data: { lastSeenAt: new Date() },
        });
    }

    /**
     * Get all active sessions for a vendor
     */
    async getActiveSessions(vendorId: string) {
        return prisma.vendorSession.findMany({
            where: {
                vendorId,
                revoked: false,
            },
            orderBy: { lastSeenAt: 'desc' },
            select: {
                id: true,
                deviceId: true,
                ip: true,
                userAgent: true,
                createdAt: true,
                lastSeenAt: true,
            },
        });
    }

    /**
     * Get session by ID
     */
    async getSession(sessionId: string) {
        return prisma.vendorSession.findUnique({
            where: { id: sessionId },
        });
    }

    /**
     * Clean up old revoked sessions (can be run as a cron job)
     */
    async cleanupOldSessions(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        const result = await prisma.vendorSession.deleteMany({
            where: {
                revoked: true,
                lastSeenAt: { lt: cutoffDate },
            },
        });

        return result.count;
    }
}

export const vendorSessionService = new VendorSessionService();
