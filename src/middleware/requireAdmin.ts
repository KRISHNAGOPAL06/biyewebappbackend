import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to check if the authenticated user is an admin
 * Must be used after authenticateToken middleware
 */
export const requireAdmin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({
                error: { message: 'Authentication required' }
            });
            return;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user) {
            res.status(404).json({
                error: { message: 'User not found' }
            });
            return;
        }

        // Check if user has admin role
        if (user.role !== 'admin' && user.role !== 'superadmin') {
            logger.warn('Non-admin user attempted to access admin endpoint', { userId });
            res.status(403).json({
                error: { message: 'Admin access required' }
            });
            return;
        }

        next();
    } catch (error: any) {
        logger.error('Error checking admin status', { error: error.message });
        res.status(500).json({
            error: { message: 'Internal server error' }
        });
    }
};
