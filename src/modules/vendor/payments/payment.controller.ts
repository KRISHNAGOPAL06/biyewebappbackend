import { Request, Response, NextFunction } from 'express';
import { vendorPaymentService } from './payment.service.js';
import {
    InitiatePaymentSchema,
    VerifyPaymentOTPSchema,
    ProcessPaymentSchema,
    RefundPaymentSchema,
    PaymentQuerySchema,
} from '../vendor.dto.js';

class VendorPaymentController {
    /**
     * Initiate a new payment
     * POST /payments/initiate
     */
    async initiatePayment(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;
            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const dto = InitiatePaymentSchema.parse(req.body);
            const result = await vendorPaymentService.initiatePayment(vendorId, dto, {
                ip: req.ip,
                userAgent: req.headers['user-agent'],
            });

            res.status(201).json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Verify payment OTP
     * POST /payments/:id/verify-otp
     */
    async verifyPaymentOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;
            const { id } = req.params;

            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const dto = VerifyPaymentOTPSchema.parse(req.body);
            const result = await vendorPaymentService.verifyPaymentOTP(id, vendorId, dto);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Process payment (gateway call)
     * POST /payments/:id/process
     */
    async processPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;
            const { id } = req.params;

            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const dto = ProcessPaymentSchema.parse(req.body);
            const result = await vendorPaymentService.processPayment(id, vendorId, dto);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel payment
     * POST /payments/:id/cancel
     */
    async cancelPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;
            const { id } = req.params;

            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const result = await vendorPaymentService.cancelPayment(id, vendorId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Resend payment OTP
     * POST /payments/:id/resend-otp
     */
    async resendOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;
            const { id } = req.params;

            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const result = await vendorPaymentService.resendPaymentOTP(id, vendorId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment by ID
     * GET /payments/:id
     */
    async getPaymentById(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;
            const { id } = req.params;

            const result = await vendorPaymentService.getPaymentById(id, vendorId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment history (vendor)
     * GET /payments
     */
    async getPaymentHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;

            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const query = PaymentQuerySchema.parse({
                ...req.query,
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 10,
            });

            const result = await vendorPaymentService.getPaymentHistory(vendorId, query);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment statistics
     * GET /payments/stats
     */
    async getPaymentStats(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = (req as any).vendor?.id;

            if (!vendorId) {
                return res.status(401).json({
                    success: false,
                    error: { message: 'Vendor not authenticated', code: 'UNAUTHORIZED' },
                });
            }

            const result = await vendorPaymentService.getPaymentStats(vendorId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Refund payment (Admin only)
     * POST /payments/:id/refund
     */
    async refundPayment(req: Request, res: Response, next: NextFunction) {
        try {
            const adminId = (req as any).user?.id;
            const { id } = req.params;

            const dto = RefundPaymentSchema.parse(req.body);
            const result = await vendorPaymentService.refundPayment(id, dto, adminId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all payments (Admin only)
     * GET /payments/admin/all
     */
    async getAllPayments(req: Request, res: Response, next: NextFunction) {
        try {
            const query = PaymentQuerySchema.parse({
                ...req.query,
                page: req.query.page ? Number(req.query.page) : 1,
                limit: req.query.limit ? Number(req.query.limit) : 10,
            });

            // Pass null for vendorId to get all payments
            const result = await vendorPaymentService.getPaymentHistory(null, query);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get payment by ID (Admin - no vendor check)
     * GET /payments/admin/:id
     */
    async getPaymentByIdAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await vendorPaymentService.getPaymentById(id);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            next(error);
        }
    }
}

export const vendorPaymentController = new VendorPaymentController();
