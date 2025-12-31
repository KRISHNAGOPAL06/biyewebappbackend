import { Request, Response, NextFunction } from 'express';
import { vendorAuthService } from './vendor-auth.service.js';
import { sendSuccess } from '../../../utils/response.js';
import { VendorSessionInfo } from './vendor-session.service.js';

class VendorAuthController {
    /**
     * Register new vendor
     */
    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await vendorAuthService.register(req.body);
            return sendSuccess(res, result, result.message, 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify OTP
     */
    async verify(req: Request, res: Response, next: NextFunction) {
        try {
            const sessionInfo: VendorSessionInfo = {
                deviceId: req.headers['x-device-id'] as string,
                ip: (req.headers['x-forwarded-for'] as string) || req.ip,
                userAgent: req.headers['user-agent'],
            };

            const result = await vendorAuthService.verifyOTP(req.body, sessionInfo);

            // Set refresh token as HTTP-only cookie
            res.cookie('vendorRefreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                path: '/',
            });

            return sendSuccess(res, result, 'Email verified successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Resend verification OTP
     */
    async resendOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await vendorAuthService.resendOTP(req.body.email);
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login vendor - Step 1: Verify credentials and send OTP
     */
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const sessionInfo: VendorSessionInfo = {
                deviceId: req.headers['x-device-id'] as string,
                ip: (req.headers['x-forwarded-for'] as string) || req.ip,
                userAgent: req.headers['user-agent'],
            };

            const result = await vendorAuthService.login(req.body, sessionInfo);

            // Login now returns OTP message, not tokens
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Login vendor - Step 2: Verify OTP and complete login
     */
    async verifyLoginOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const sessionInfo: VendorSessionInfo = {
                deviceId: req.headers['x-device-id'] as string,
                ip: (req.headers['x-forwarded-for'] as string) || req.ip,
                userAgent: req.headers['user-agent'],
            };

            const result = await vendorAuthService.verifyLoginOTP(req.body, sessionInfo);

            // Set refresh token as HTTP-only cookie
            res.cookie('vendorRefreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });

            return sendSuccess(res, result, 'Login successful', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Refresh access token
     */
    async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            const refreshToken = req.cookies.vendorRefreshToken || req.body.refreshToken;

            if (!refreshToken) {
                return sendSuccess(res, null, 'Refresh token not found', 401);
            }

            const result = await vendorAuthService.refresh(refreshToken);

            // Update refresh token cookie
            res.cookie('vendorRefreshToken', result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: '/',
            });

            return sendSuccess(res, result, 'Token refreshed successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Logout vendor
     */
    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const sessionId = req.vendorSessionId;

            if (sessionId) {
                await vendorAuthService.logout(sessionId);
            }

            // Clear refresh token cookie
            res.clearCookie('vendorRefreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });

            return sendSuccess(res, null, 'Logged out successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Logout from all devices
     */
    async logoutAll(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            await vendorAuthService.logoutAll(vendorId);

            // Clear refresh token cookie
            res.clearCookie('vendorRefreshToken', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/',
            });

            return sendSuccess(res, null, 'Logged out from all devices', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get current vendor info
     */
    async me(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const vendor = await vendorAuthService.getMe(vendorId);
            return sendSuccess(res, vendor, 'Vendor retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Request password reset
     */
    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await vendorAuthService.requestPasswordReset(req.body.email);
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reset password with OTP
     */
    async resetPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp, newPassword } = req.body;
            const result = await vendorAuthService.resetPassword(email, otp, newPassword);
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get active sessions
     */
    async getSessions(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const sessions = await vendorAuthService.getSessions(vendorId);
            return sendSuccess(res, sessions, 'Sessions retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Revoke a specific session
     */
    async revokeSession(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;
            const { sessionId } = req.params;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            await vendorAuthService.revokeSession(vendorId, sessionId);
            return sendSuccess(res, null, 'Session revoked successfully', 200);
        } catch (error) {
            next(error);
        }
    }
}

export const vendorAuthController = new VendorAuthController();
