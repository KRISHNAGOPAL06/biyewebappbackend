import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { VendorJWTPayload } from '../middleware/vendor-auth.middleware.js';

const prisma = new PrismaClient();

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface VendorTokenPair {
    accessToken: string;
    refreshToken: string;
}

class VendorTokenService {
    private getSecret(): string {
        const secret = process.env.VENDOR_JWT_SECRET || process.env.JWT_SECRET;
        if (!secret) {
            throw new Error('JWT secret not configured');
        }
        return secret;
    }

    private getRefreshSecret(): string {
        const secret = process.env.VENDOR_REFRESH_SECRET || process.env.REFRESH_SECRET || this.getSecret();
        return secret;
    }

    /**
     * Generate access token for vendor
     */
    generateAccessToken(vendorId: string, email: string, sessionId: string): string {
        const payload: VendorJWTPayload = {
            vendorId,
            email,
            sessionId,
            type: 'vendor',
        };

        return jwt.sign(payload, this.getSecret(), {
            expiresIn: ACCESS_TOKEN_EXPIRY,
            issuer: 'biye-vendor',
            audience: 'biye-vendor-app',
        });
    }

    /**
     * Generate refresh token for vendor
     */
    generateRefreshToken(vendorId: string, sessionId: string): string {
        const payload = {
            vendorId,
            sessionId,
            type: 'vendor_refresh',
        };

        return jwt.sign(payload, this.getRefreshSecret(), {
            expiresIn: REFRESH_TOKEN_EXPIRY,
            issuer: 'biye-vendor',
            audience: 'biye-vendor-app',
        });
    }

    /**
     * Generate both tokens
     */
    generateTokenPair(vendorId: string, email: string, sessionId: string): VendorTokenPair {
        return {
            accessToken: this.generateAccessToken(vendorId, email, sessionId),
            refreshToken: this.generateRefreshToken(vendorId, sessionId),
        };
    }

    /**
     * Verify access token
     */
    async verifyAccessToken(token: string): Promise<VendorJWTPayload> {
        try {
            const payload = jwt.verify(token, this.getSecret(), {
                issuer: 'biye-vendor',
                audience: 'biye-vendor-app',
            }) as VendorJWTPayload;

            if (payload.type !== 'vendor') {
                throw new Error('Invalid vendor token type');
            }

            return payload;
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Access token expired');
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid access token');
            }
            throw error;
        }
    }

    /**
     * Verify refresh token
     */
    async verifyRefreshToken(token: string): Promise<{ vendorId: string; sessionId: string }> {
        try {
            const payload = jwt.verify(token, this.getRefreshSecret(), {
                issuer: 'biye-vendor',
                audience: 'biye-vendor-app',
            }) as { vendorId: string; sessionId: string; type: string };

            if (payload.type !== 'vendor_refresh') {
                throw new Error('Invalid refresh token type');
            }

            return { vendorId: payload.vendorId, sessionId: payload.sessionId };
        } catch (error) {
            if (error instanceof jwt.TokenExpiredError) {
                throw new Error('Refresh token expired');
            }
            if (error instanceof jwt.JsonWebTokenError) {
                throw new Error('Invalid refresh token');
            }
            throw error;
        }
    }
}

export const vendorTokenService = new VendorTokenService();
