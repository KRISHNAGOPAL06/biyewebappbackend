import { PrismaClient, PaymentMethod } from '@prisma/client';
import {
    InitiatePaymentDTO,
    VerifyPaymentOTPDTO,
    ProcessPaymentDTO,
    RefundPaymentDTO,
    PaymentQueryDTO
} from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';
import crypto from 'crypto';

const prisma = new PrismaClient();

// OTP Configuration
const OTP_EXPIRY_MINUTES = 10;

class VendorPaymentService {
    /**
     * Generate OTP and hash
     */
    private generateOTP(): { otp: string; hash: string } {
        const otp = crypto.randomInt(100000, 999999).toString();
        const hash = crypto.createHash('sha256').update(otp).digest('hex');
        return { otp, hash };
    }

    /**
     * Verify OTP hash
     */
    private verifyOTPHash(inputOTP: string, storedHash: string): boolean {
        const inputHash = crypto.createHash('sha256').update(inputOTP).digest('hex');
        return inputHash === storedHash;
    }

    /**
     * Generate a unique gateway order ID (for mock gateway)
     */
    private generateOrderId(): string {
        return `ORD_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    /**
     * Initiate a new payment - creates payment record with INITIATED status
     */
    async initiatePayment(
        vendorId: string,
        dto: InitiatePaymentDTO,
        requestInfo?: { ip?: string; userAgent?: string }
    ) {
        // Validate booking if provided
        if (dto.bookingId) {
            const booking = await prisma.serviceBooking.findFirst({
                where: { id: dto.bookingId, vendorId },
            });
            if (!booking) {
                throw new AppError('Booking not found or does not belong to vendor', 404, 'BOOKING_NOT_FOUND');
            }
        }

        // Generate OTP for payment verification
        const { otp, hash } = this.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        // Create payment record
        const payment = await prisma.vendorPayment.create({
            data: {
                vendorId,
                bookingId: dto.bookingId,
                amount: dto.amount,
                currency: dto.currency || 'INR',
                method: dto.method as PaymentMethod,
                status: 'INITIATED',
                description: dto.description,
                otpHash: hash,
                otpExpiry,
                gatewayOrderId: this.generateOrderId(),
                ipAddress: requestInfo?.ip,
                userAgent: requestInfo?.userAgent,
                metadata: dto.metadata,
            },
        });

        // In production, send OTP via email/SMS
        // For now, log it (replace with actual email service)
        console.log(`[PAYMENT OTP] Payment ${payment.id}: ${otp}`);

        return {
            paymentId: payment.id,
            orderId: payment.gatewayOrderId,
            amount: payment.amount,
            currency: payment.currency,
            method: payment.method,
            status: payment.status,
            message: 'Payment initiated. OTP sent for verification.',
            expiresAt: otpExpiry,
        };
    }

    /**
     * Verify OTP for payment
     */
    async verifyPaymentOTP(paymentId: string, vendorId: string, dto: VerifyPaymentOTPDTO) {
        const payment = await prisma.vendorPayment.findFirst({
            where: { id: paymentId, vendorId },
        });

        if (!payment) {
            throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
        }

        if (payment.status !== 'INITIATED') {
            throw new AppError(`Cannot verify OTP. Payment status is ${payment.status}`, 400, 'INVALID_PAYMENT_STATUS');
        }

        if (!payment.otpHash || !payment.otpExpiry) {
            throw new AppError('No OTP request found for this payment', 400, 'NO_OTP_REQUEST');
        }

        if (new Date() > payment.otpExpiry) {
            // Mark as failed due to OTP expiry
            await prisma.vendorPayment.update({
                where: { id: paymentId },
                data: {
                    status: 'FAILED',
                    failedAt: new Date(),
                    failureReason: 'OTP expired',
                    failureCode: 'OTP_EXPIRED',
                },
            });
            throw new AppError('OTP has expired. Please initiate a new payment.', 400, 'OTP_EXPIRED');
        }

        if (!this.verifyOTPHash(dto.otp, payment.otpHash)) {
            throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
        }

        // Update payment status to OTP_VERIFIED
        const updatedPayment = await prisma.vendorPayment.update({
            where: { id: paymentId },
            data: {
                status: 'OTP_VERIFIED',
                otpVerifiedAt: new Date(),
                otpHash: null, // Clear OTP after verification
                otpExpiry: null,
            },
        });

        return {
            paymentId: updatedPayment.id,
            status: updatedPayment.status,
            message: 'OTP verified successfully. Ready to process payment.',
        };
    }

    /**
     * Process payment (simulate gateway call)
     * In production, this would call actual payment gateway
     */
    async processPayment(paymentId: string, vendorId: string, dto?: ProcessPaymentDTO) {
        const payment = await prisma.vendorPayment.findFirst({
            where: { id: paymentId, vendorId },
        });

        if (!payment) {
            throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
        }

        if (payment.status !== 'OTP_VERIFIED') {
            throw new AppError(`Cannot process payment. Current status: ${payment.status}`, 400, 'INVALID_PAYMENT_STATUS');
        }

        // Update to PROCESSING
        await prisma.vendorPayment.update({
            where: { id: paymentId },
            data: {
                status: 'PROCESSING',
                processingAt: new Date(),
                gatewayName: dto?.gatewayName || 'mock_gateway',
            },
        });

        // Simulate gateway processing (in production, call actual gateway here)
        // For mock: 90% success rate
        const isSuccess = Math.random() > 0.1;
        const transactionId = `TXN_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        if (isSuccess) {
            const updatedPayment = await prisma.vendorPayment.update({
                where: { id: paymentId },
                data: {
                    status: 'SUCCESS',
                    completedAt: new Date(),
                    transactionId,
                    gatewayResponse: {
                        status: 'captured',
                        transactionId,
                        timestamp: new Date().toISOString(),
                        mock: true,
                    },
                },
            });

            return {
                paymentId: updatedPayment.id,
                status: 'SUCCESS',
                transactionId,
                message: 'Payment completed successfully',
            };
        } else {
            const updatedPayment = await prisma.vendorPayment.update({
                where: { id: paymentId },
                data: {
                    status: 'FAILED',
                    failedAt: new Date(),
                    failureReason: 'Gateway declined the transaction',
                    failureCode: 'GATEWAY_DECLINED',
                    gatewayResponse: {
                        status: 'failed',
                        error: 'Insufficient funds or card declined',
                        timestamp: new Date().toISOString(),
                        mock: true,
                    },
                },
            });

            return {
                paymentId: updatedPayment.id,
                status: 'FAILED',
                message: 'Payment failed. Gateway declined the transaction.',
                failureReason: updatedPayment.failureReason,
            };
        }
    }

    /**
     * Cancel an initiated payment
     */
    async cancelPayment(paymentId: string, vendorId: string) {
        const payment = await prisma.vendorPayment.findFirst({
            where: { id: paymentId, vendorId },
        });

        if (!payment) {
            throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
        }

        if (!['INITIATED', 'OTP_VERIFIED'].includes(payment.status)) {
            throw new AppError(`Cannot cancel payment with status: ${payment.status}`, 400, 'INVALID_PAYMENT_STATUS');
        }

        const updatedPayment = await prisma.vendorPayment.update({
            where: { id: paymentId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
        });

        return {
            paymentId: updatedPayment.id,
            status: 'CANCELLED',
            message: 'Payment cancelled successfully',
        };
    }

    /**
     * Refund a successful payment (Admin only)
     */
    async refundPayment(paymentId: string, dto: RefundPaymentDTO, adminId?: string) {
        const payment = await prisma.vendorPayment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
        }

        if (payment.status !== 'SUCCESS') {
            throw new AppError('Only successful payments can be refunded', 400, 'INVALID_PAYMENT_STATUS');
        }

        const refundAmount = dto.amount || payment.amount;
        if (Number(refundAmount) > Number(payment.amount)) {
            throw new AppError('Refund amount cannot exceed payment amount', 400, 'INVALID_REFUND_AMOUNT');
        }

        const refundTransactionId = `REF_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

        const updatedPayment = await prisma.vendorPayment.update({
            where: { id: paymentId },
            data: {
                status: 'REFUNDED',
                refundedAt: new Date(),
                refundAmount,
                refundReason: dto.reason,
                refundTransactionId,
                refundGatewayResponse: {
                    status: 'refunded',
                    refundTransactionId,
                    adminId,
                    timestamp: new Date().toISOString(),
                    mock: true,
                },
            },
        });

        return {
            paymentId: updatedPayment.id,
            status: 'REFUNDED',
            refundAmount: updatedPayment.refundAmount,
            refundTransactionId,
            message: 'Payment refunded successfully',
        };
    }

    /**
     * Get payment by ID
     */
    async getPaymentById(paymentId: string, vendorId?: string) {
        const where: any = { id: paymentId };
        if (vendorId) {
            where.vendorId = vendorId;
        }

        const payment = await prisma.vendorPayment.findFirst({
            where,
            include: {
                booking: {
                    select: {
                        id: true,
                        eventDate: true,
                        status: true,
                        service: {
                            select: { title: true },
                        },
                    },
                },
            },
        });

        if (!payment) {
            throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
        }

        return payment;
    }

    /**
     * Get payment history with filters
     */
    async getPaymentHistory(vendorId: string | null, query: PaymentQueryDTO) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (vendorId) {
            where.vendorId = vendorId;
        }
        if (query.status) {
            where.status = query.status;
        }
        if (query.method) {
            where.method = query.method;
        }
        if (query.bookingId) {
            where.bookingId = query.bookingId;
        }
        if (query.fromDate || query.toDate) {
            where.createdAt = {};
            if (query.fromDate) {
                where.createdAt.gte = new Date(query.fromDate);
            }
            if (query.toDate) {
                where.createdAt.lte = new Date(query.toDate);
            }
        }
        if (query.minAmount || query.maxAmount) {
            where.amount = {};
            if (query.minAmount) {
                where.amount.gte = query.minAmount;
            }
            if (query.maxAmount) {
                where.amount.lte = query.maxAmount;
            }
        }

        const [payments, total] = await Promise.all([
            prisma.vendorPayment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [sortBy]: sortOrder },
                include: {
                    booking: {
                        select: {
                            id: true,
                            eventDate: true,
                            service: {
                                select: { title: true },
                            },
                        },
                    },
                    vendor: {
                        select: {
                            id: true,
                            businessName: true,
                        },
                    },
                },
            }),
            prisma.vendorPayment.count({ where }),
        ]);

        return {
            payments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get payment statistics for dashboard
     */
    async getPaymentStats(vendorId: string) {
        const [
            totalPayments,
            successfulPayments,
            failedPayments,
            pendingPayments,
            totalRevenue,
            recentPayments,
        ] = await Promise.all([
            prisma.vendorPayment.count({ where: { vendorId } }),
            prisma.vendorPayment.count({ where: { vendorId, status: 'SUCCESS' } }),
            prisma.vendorPayment.count({ where: { vendorId, status: 'FAILED' } }),
            prisma.vendorPayment.count({ where: { vendorId, status: { in: ['INITIATED', 'OTP_VERIFIED', 'PROCESSING'] } } }),
            prisma.vendorPayment.aggregate({
                where: { vendorId, status: 'SUCCESS' },
                _sum: { amount: true },
            }),
            prisma.vendorPayment.findMany({
                where: { vendorId },
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    amount: true,
                    status: true,
                    method: true,
                    createdAt: true,
                    transactionId: true,
                },
            }),
        ]);

        // Status breakdown
        const statusBreakdown = await prisma.vendorPayment.groupBy({
            by: ['status'],
            where: { vendorId },
            _count: { status: true },
            _sum: { amount: true },
        });

        // Method breakdown
        const methodBreakdown = await prisma.vendorPayment.groupBy({
            by: ['method'],
            where: { vendorId },
            _count: { method: true },
        });

        return {
            overview: {
                totalPayments,
                successfulPayments,
                failedPayments,
                pendingPayments,
                totalRevenue: totalRevenue._sum.amount || 0,
                successRate: totalPayments > 0 ? ((successfulPayments / totalPayments) * 100).toFixed(2) : 0,
            },
            statusBreakdown: statusBreakdown.map(s => ({
                status: s.status,
                count: s._count.status,
                amount: s._sum.amount || 0,
            })),
            methodBreakdown: methodBreakdown.map(m => ({
                method: m.method,
                count: m._count.method,
            })),
            recentPayments,
        };
    }

    /**
     * Resend OTP for payment
     */
    async resendPaymentOTP(paymentId: string, vendorId: string) {
        const payment = await prisma.vendorPayment.findFirst({
            where: { id: paymentId, vendorId },
        });

        if (!payment) {
            throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
        }

        if (payment.status !== 'INITIATED') {
            throw new AppError(`Cannot resend OTP. Payment status is ${payment.status}`, 400, 'INVALID_PAYMENT_STATUS');
        }

        const { otp, hash } = this.generateOTP();
        const otpExpiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

        await prisma.vendorPayment.update({
            where: { id: paymentId },
            data: {
                otpHash: hash,
                otpExpiry,
            },
        });

        // Send OTP (replace with actual email/SMS service)
        console.log(`[PAYMENT OTP RESEND] Payment ${paymentId}: ${otp}`);

        return {
            paymentId,
            message: 'OTP resent successfully',
            expiresAt: otpExpiry,
        };
    }
}

export const vendorPaymentService = new VendorPaymentService();
