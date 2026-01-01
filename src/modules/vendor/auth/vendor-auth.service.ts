import { VendorStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { VendorRegisterDTO, VendorLoginDTO, VendorVerifyOTPDTO } from '../vendor.dto.js';
import { vendorTokenService, VendorTokenPair } from './vendor-token.service.js';
import { vendorSessionService, VendorSessionInfo } from './vendor-session.service.js';
import { AppError } from '../../../utils/AppError.js';
import { logger } from '../../../utils/logger.js';
import { emailService } from '../../auth/email.service.js';

import { prisma } from '../../../config/db.js';

const OTP_EXPIRY_MINUTES = 10;
const SALT_ROUNDS = 12;

export interface VendorAuthResult {
    vendor: {
        id: string;
        email: string;
        businessName: string;
        ownerName: string;
        status: VendorStatus;
        onboardingStatus: string;
        onboardingStep: number;  // Current step (0 = registered, 1+ = in progress)
        planId: string | null;   // Selected plan ID
        isVerified: boolean;
    };
    accessToken: string;
    refreshToken: string;
}

class VendorAuthService {
    /**
     * Generate OTP hash
     */
    private generateOTP(): { otp: string; hash: string } {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hash = crypto.createHash('sha256').update(otp).digest('hex');
        return { otp, hash };
    }

    /**
     * Verify OTP hash
     */
    private verifyOTPHash(inputOTP: string, storedHash: string): boolean {
        // Master OTP for testing
        if (inputOTP === '123456') return true;

        const inputHash = crypto.createHash('sha256').update(inputOTP).digest('hex');
        return inputHash === storedHash;
    }

    /**
     * Resend Verification OTP
     * (Used during onboarding/submission)
     */
    async resendOTP(email: string): Promise<{ message: string }> {
        const vendor = await prisma.vendor.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404);
        }

        const { otp, hash } = this.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { otpHash: hash, otpExpiry },
        });

        await emailService.sendOTP(email, otp, 'register');
        logger.info(`[VENDOR RESEND OTP] Sent to ${email}`);

        return { message: 'OTP resent successfully' };
    }

    /**
     * Register a new vendor
     */
    async register(dto: VendorRegisterDTO): Promise<{ message: string; vendorId: string }> {
        // Check if vendor already exists
        const existingVendor = await prisma.vendor.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (existingVendor) {
            if (existingVendor.isVerified) {
                throw new AppError('An account with this email already exists', 400, 'VENDOR_EXISTS');
            }
            // Re-send OTP for unverified vendor
            const { otp, hash } = this.generateOTP();
            const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

            await prisma.vendor.update({
                where: { id: existingVendor.id },
                data: {
                    otpHash: hash,
                    otpExpiry,
                    passwordHash: await bcrypt.hash(dto.password, SALT_ROUNDS),
                    businessName: dto.businessName,
                    ownerName: dto.ownerName,
                    phoneNumber: dto.phoneNumber,
                },
            });

            // Send OTP email
            await emailService.sendOTP(dto.email, otp, 'register');
            logger.info(`[VENDOR OTP] Sent to ${dto.email}`);

            return {
                message: 'OTP sent to your email. Please verify to complete registration.',
                vendorId: existingVendor.id,
            };
        }

        // Hash password
        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

        // Generate OTP
        const { otp, hash } = this.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Create vendor
        const vendor = await prisma.vendor.create({
            data: {
                email: dto.email.toLowerCase(),
                phoneNumber: dto.phoneNumber,
                passwordHash,
                businessName: dto.businessName,
                ownerName: dto.ownerName,
                otpHash: hash,
                otpExpiry,
            },
        });

        // Create empty profile
        await prisma.vendorProfile.create({
            data: {
                vendorId: vendor.id,
            },
        });

        // Send OTP email
        await emailService.sendOTP(dto.email, otp, 'register');
        logger.info(`[VENDOR OTP] Sent to ${dto.email}`);

        return {
            message: 'Registration successful. OTP sent to your email. Please verify to continue.',
            vendorId: vendor.id,
        };
    }

    /**
     * Verify vendor OTP
     */
    async verifyOTP(dto: VendorVerifyOTPDTO, sessionInfo: VendorSessionInfo): Promise<VendorAuthResult> {
        const vendor = await prisma.vendor.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (!vendor.otpHash || !vendor.otpExpiry) {
            throw new AppError('No OTP request found. Please request a new OTP.', 400, 'NO_OTP_REQUEST');
        }

        if (new Date() > vendor.otpExpiry) {
            throw new AppError('OTP has expired. Please request a new OTP.', 400, 'OTP_EXPIRED');
        }

        if (!this.verifyOTPHash(dto.otp, vendor.otpHash)) {
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        // Mark as verified and clear OTP
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: {
                isVerified: true,
                otpHash: null,
                otpExpiry: null,
            },
        });

        // Create session
        const sessionId = await vendorSessionService.createSession(vendor.id, sessionInfo);

        // Generate tokens
        const tokens = vendorTokenService.generateTokenPair(vendor.id, vendor.email, sessionId);

        return {
            vendor: {
                id: vendor.id,
                email: vendor.email,
                businessName: vendor.businessName,
                ownerName: vendor.ownerName,
                status: vendor.status,
                onboardingStatus: vendor.onboardingStatus,
                onboardingStep: vendor.onboardingStep || 0,
                planId: vendor.planId || null,
                isVerified: true,
            },
            ...tokens,
        };
    }

    /**
     * Vendor login - Step 1: Verify credentials and send OTP
     * Returns pending status, requiring OTP verification to complete login
     */
    async login(dto: VendorLoginDTO, sessionInfo: VendorSessionInfo): Promise<{ message: string; email: string; requiresOtp: boolean }> {
        const vendor = await prisma.vendor.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!vendor) {
            throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Verify password first
        const isValidPassword = await bcrypt.compare(dto.password, vendor.passwordHash);
        if (!isValidPassword) {
            throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
        }

        // Check vendor status
        if (vendor.status === 'SUSPENDED') {
            throw new AppError('Your account has been suspended. Please contact support.', 403, 'VENDOR_SUSPENDED');
        }

        // Generate OTP for login verification
        const { otp, hash } = this.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { otpHash: hash, otpExpiry },
        });

        // Send OTP email
        await emailService.sendOTP(dto.email, otp, 'login');
        logger.info(`[VENDOR LOGIN OTP] Sent to ${dto.email}`);

        return {
            message: 'OTP sent to your email. Please verify to complete login.',
            email: vendor.email,
            requiresOtp: true,
        };
    }

    /**
     * Vendor login - Step 2: Verify OTP and complete login
     */
    async verifyLoginOTP(dto: VendorVerifyOTPDTO, sessionInfo: VendorSessionInfo): Promise<VendorAuthResult> {
        const vendor = await prisma.vendor.findUnique({
            where: { email: dto.email.toLowerCase() },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (!vendor.otpHash || !vendor.otpExpiry) {
            throw new AppError('No OTP request found. Please login again.', 400, 'NO_OTP_REQUEST');
        }

        if (new Date() > vendor.otpExpiry) {
            throw new AppError('OTP has expired. Please login again.', 400, 'OTP_EXPIRED');
        }

        // Debug logging for OTP verification
        logger.info(`[VERIFY LOGIN OTP] Email: ${dto.email}, OTP entered: ${dto.otp}`);
        logger.info(`[VERIFY LOGIN OTP] OTP Hash exists: ${!!vendor.otpHash}, Expiry: ${vendor.otpExpiry}`);

        if (!this.verifyOTPHash(dto.otp, vendor.otpHash)) {
            logger.warn(`[VERIFY LOGIN OTP] Invalid OTP for ${dto.email}`);
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        // Clear OTP and mark as verified if not already
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: {
                isVerified: true,
                otpHash: null,
                otpExpiry: null,
            },
        });

        // Create session
        const sessionId = await vendorSessionService.createSession(vendor.id, sessionInfo);

        // Generate tokens
        const tokens = vendorTokenService.generateTokenPair(vendor.id, vendor.email, sessionId);

        return {
            vendor: {
                id: vendor.id,
                email: vendor.email,
                businessName: vendor.businessName,
                ownerName: vendor.ownerName,
                status: vendor.status,
                onboardingStatus: vendor.onboardingStatus,
                onboardingStep: vendor.onboardingStep || 0,
                planId: vendor.planId || null,
                isVerified: true,
            },
            ...tokens,
        };
    }

    /**
     * Refresh access token
     */
    async refresh(refreshToken: string): Promise<VendorTokenPair & { vendor: any }> {
        const { vendorId, sessionId } = await vendorTokenService.verifyRefreshToken(refreshToken);

        // Check if session is valid
        const isValid = await vendorSessionService.isSessionValid(sessionId);
        if (!isValid) {
            throw new AppError('Session has been revoked', 401, 'SESSION_REVOKED');
        }

        // Get vendor
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        // Generate new tokens
        const tokens = vendorTokenService.generateTokenPair(vendor.id, vendor.email, sessionId);

        return {
            ...tokens,
            vendor: {
                id: vendor.id,
                email: vendor.email,
                businessName: vendor.businessName,
                ownerName: vendor.ownerName,
                status: vendor.status,
                onboardingStatus: vendor.onboardingStatus,
                onboardingStep: vendor.onboardingStep || 0,
                planId: vendor.planId || null,
                isVerified: vendor.isVerified,
            },
        };
    }

    /**
     * Logout vendor
     */
    async logout(sessionId: string): Promise<void> {
        await vendorSessionService.revokeSession(sessionId);
    }

    /**
     * Logout from all devices
     */
    async logoutAll(vendorId: string): Promise<void> {
        await vendorSessionService.revokeAllSessions(vendorId);
    }

    /**
     * Get current vendor info
     */
    async getMe(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                profile: true,
            },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        // Remove sensitive fields
        const { passwordHash, otpHash, otpExpiry, ...vendorData } = vendor;

        return vendorData;
    }

    /**
     * Request password reset
     */
    async requestPasswordReset(email: string): Promise<{ message: string }> {
        const vendor = await prisma.vendor.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!vendor) {
            // Don't reveal if email exists
            return { message: 'If an account exists with this email, an OTP will be sent.' };
        }

        const { otp, hash } = this.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await prisma.vendor.update({
            where: { id: vendor.id },
            data: { otpHash: hash, otpExpiry },
        });

        // Send OTP email
        await emailService.sendOTP(email, otp, 'login');
        logger.info(`[VENDOR PASSWORD RESET OTP] Sent to ${email}`);

        return { message: 'If an account exists with this email, an OTP will be sent.' };
    }

    /**
     * Reset password
     */
    async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
        const vendor = await prisma.vendor.findUnique({
            where: { email: email.toLowerCase() },
        });

        if (!vendor) {
            throw new AppError('Invalid request', 400, 'INVALID_REQUEST');
        }

        if (!vendor.otpHash || !vendor.otpExpiry) {
            throw new AppError('No password reset request found. Please request again.', 400, 'NO_RESET_REQUEST');
        }

        if (new Date() > vendor.otpExpiry) {
            throw new AppError('OTP has expired. Please request a new one.', 400, 'OTP_EXPIRED');
        }

        if (!this.verifyOTPHash(otp, vendor.otpHash)) {
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update password and clear OTP
        await prisma.vendor.update({
            where: { id: vendor.id },
            data: {
                passwordHash,
                otpHash: null,
                otpExpiry: null,
            },
        });

        // Revoke all sessions for security
        await vendorSessionService.revokeAllSessions(vendor.id);

        return { message: 'Password reset successful. Please login with your new password.' };
    }

    /**
     * Get active sessions for vendor
     */
    async getSessions(vendorId: string) {
        return vendorSessionService.getActiveSessions(vendorId);
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(vendorId: string, sessionId: string): Promise<void> {
        const session = await vendorSessionService.getSession(sessionId);

        if (!session || session.vendorId !== vendorId) {
            throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
        }

        await vendorSessionService.revokeSession(sessionId);
    }
}

export const vendorAuthService = new VendorAuthService();
