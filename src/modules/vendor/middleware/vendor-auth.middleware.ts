import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// (Type only, no runtime import needed)
import { sendError } from '../../../utils/response.js';
import { logger } from '../../../utils/logger.js';

import { prisma } from '../../../config/db.js';

export interface VendorJWTPayload {
    vendorId: string;
    email: string;
    sessionId: string;
    type: 'vendor';
}

declare global {
    namespace Express {
        interface Request {
            vendorId?: string;
            vendorSessionId?: string;
            vendorEmail?: string;
        }
    }
}

/**
 * Middleware to authenticate vendor JWT tokens
 */
export async function authenticateVendor(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendError(res, 'No token provided', 401, 'VENDOR_UNAUTHORIZED');
        return;
    }

    const token = authHeader.substring(7);

    try {
        const secret = process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT secret not configured');
        }

        const payload = jwt.verify(token, secret) as VendorJWTPayload;

        // Verify it's a vendor token
        if (payload.type !== 'vendor') {
            sendError(res, 'Invalid vendor token', 401, 'INVALID_VENDOR_TOKEN');
            return;
        }

        // Check if session is valid
        const session = await prisma.vendorSession.findUnique({
            where: { id: payload.sessionId },
        });

        if (!session || session.revoked) {
            sendError(res, 'Session has been revoked', 401, 'VENDOR_SESSION_REVOKED');
            return;
        }

        // Check if vendor exists and is approved
        const vendor = await prisma.vendor.findUnique({
            where: { id: payload.vendorId },
        });

        if (!vendor) {
            sendError(res, 'Vendor not found', 401, 'VENDOR_NOT_FOUND');
            return;
        }

        if (!vendor.isVerified) {
            sendError(res, 'Vendor email not verified', 401, 'VENDOR_NOT_VERIFIED');
            return;
        }

        req.vendorId = payload.vendorId;
        req.vendorSessionId = payload.sessionId;
        req.vendorEmail = payload.email;

        // Update session last seen
        await prisma.vendorSession.update({
            where: { id: payload.sessionId },
            data: { lastSeenAt: new Date() },
        });

        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

        logger.warn('Vendor authentication failed', {
            error: errorMessage,
            ip: req.ip,
            path: req.path,
        });

        if (errorMessage.includes('expired')) {
            sendError(res, 'Access token expired', 401, 'VENDOR_TOKEN_EXPIRED');
            return;
        }

        if (errorMessage.includes('invalid') || errorMessage.includes('malformed')) {
            sendError(res, 'Invalid access token', 401, 'INVALID_VENDOR_TOKEN');
            return;
        }

        sendError(res, 'Vendor authentication failed', 401, 'VENDOR_UNAUTHORIZED');
    }
}

/**
 * Middleware to check if vendor is approved
 */
export async function requireApprovedVendor(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    if (!req.vendorId) {
        sendError(res, 'Vendor authentication required', 401, 'VENDOR_UNAUTHORIZED');
        return;
    }

    try {
        const vendor = await prisma.vendor.findUnique({
            where: { id: req.vendorId },
        });

        if (!vendor) {
            sendError(res, 'Vendor not found', 404, 'VENDOR_NOT_FOUND');
            return;
        }

        if (vendor.status !== 'APPROVED') {
            sendError(
                res,
                `Vendor account is ${vendor.status.toLowerCase()}. Please wait for admin approval.`,
                403,
                'VENDOR_NOT_APPROVED'
            );
            return;
        }

        next();
    } catch (error) {
        logger.error('Error checking vendor approval status', { error, vendorId: req.vendorId });
        sendError(res, 'Failed to verify vendor status', 500, 'INTERNAL_ERROR');
    }
}

/**
 * Middleware to authenticate admin (uses existing User model with admin role check)
 */
export async function authenticateAdmin(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        sendError(res, 'No token provided', 401, 'UNAUTHORIZED');
        return;
    }

    const token = authHeader.substring(7);

    try {
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        if (!secret) {
            throw new Error('JWT secret not configured');
        }

        const payload = jwt.verify(token, secret) as any;

        // Check for hardcoded admin
        if (payload.role === 'ADMIN' && (payload.id === 'admin-001' || payload.userId === 'admin-001')) {
            req.userId = 'admin-001';
            req.email = payload.email;
            // @ts-ignore
            req.user = { id: 'admin-001', email: payload.email, role: 'admin' };
            next();
            return;
        }

        // Regular user admin check
        const userId = payload.userId || payload.id;

        if (!userId) {
            throw new Error('Invalid token payload');
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            sendError(res, 'User not found', 401, 'USER_NOT_FOUND');
            return;
        }

        // Check for admin role
        if (user.role !== 'admin') {
            sendError(res, 'Admin access required', 403, 'ADMIN_ACCESS_REQUIRED');
            return;
        }

        req.userId = user.id;
        req.email = user.email;
        // @ts-ignore
        req.user = user;

        next();
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Authentication failed';

        logger.warn('Admin authentication failed', {
            error: errorMessage,
            ip: req.ip,
            path: req.path,
        });

        sendError(res, 'Admin authentication failed: ' + errorMessage, 401, 'UNAUTHORIZED');
    }
}
