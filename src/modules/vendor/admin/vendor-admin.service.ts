import { PrismaClient } from '@prisma/client';
import { VendorApprovalDTO } from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';
import { logger } from '../../../utils/logger.js';

// VendorStatus type - matches Prisma enum
type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

const prisma = new PrismaClient();

class VendorAdminService {
    /**
     * Get all vendors with filters
     */
    async getVendors(options: {
        status?: VendorStatus;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        const where: any = {};

        if (options.status) {
            where.status = options.status;
        }

        if (options.search) {
            where.OR = [
                { businessName: { contains: options.search, mode: 'insensitive' } },
                { ownerName: { contains: options.search, mode: 'insensitive' } },
                { email: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    businessName: true,
                    ownerName: true,
                    status: true,
                    isVerified: true,
                    createdAt: true,
                    approvedAt: true,
                    profile: {
                        select: {
                            logo: true,
                            city: true,
                            state: true,
                        },
                    },
                    _count: {
                        select: { services: true },
                    },
                },
            }),
            prisma.vendor.count({ where }),
        ]);

        return {
            vendors,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get vendor details
     */
    async getVendorDetails(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                profile: true,
                services: {
                    include: {
                        category: {
                            select: { id: true, name: true },
                        },
                    },
                },
                _count: {
                    select: {
                        services: true,
                    },
                },
            },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        // Get booking stats
        const bookingStats = await prisma.serviceBooking.groupBy({
            by: ['status'],
            where: { vendorId },
            _count: { status: true },
        });

        // Get review stats
        const reviewStats = await prisma.serviceReview.aggregate({
            where: { vendorId },
            _avg: { rating: true },
            _count: { rating: true },
        });

        // Remove sensitive fields
        const { passwordHash, otpHash, otpExpiry, ...vendorData } = vendor;

        return {
            ...vendorData,
            stats: {
                bookings: bookingStats.reduce((acc, curr) => {
                    acc[curr.status.toLowerCase()] = curr._count.status;
                    return acc;
                }, {} as Record<string, number>),
                reviews: {
                    average: reviewStats._avg.rating || 0,
                    total: reviewStats._count.rating,
                },
            },
        };
    }

    /**
     * Approve vendor
     */
    async approveVendor(vendorId: string, adminUserId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (vendor.status === 'APPROVED') {
            throw new AppError('Vendor is already approved', 400, 'ALREADY_APPROVED');
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                status: 'APPROVED',
                approvedAt: new Date(),
                approvedBy: adminUserId,
                rejectionReason: null,
            },
        });

        logger.info('Vendor approved', { vendorId, adminUserId });

        // TODO: Send approval notification email to vendor

        return updatedVendor;
    }

    /**
     * Reject vendor
     */
    async rejectVendor(vendorId: string, adminUserId: string, reason?: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (vendor.status === 'REJECTED') {
            throw new AppError('Vendor is already rejected', 400, 'ALREADY_REJECTED');
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                status: 'REJECTED',
                rejectionReason: reason,
                approvedAt: null,
                approvedBy: null,
            },
        });

        logger.info('Vendor rejected', { vendorId, adminUserId, reason });

        // TODO: Send rejection notification email to vendor

        return updatedVendor;
    }

    /**
     * Suspend vendor
     */
    async suspendVendor(vendorId: string, adminUserId: string, reason?: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (vendor.status === 'SUSPENDED') {
            throw new AppError('Vendor is already suspended', 400, 'ALREADY_SUSPENDED');
        }

        const updatedVendor = await prisma.vendor.update({
            where: { id: vendorId },
            data: {
                status: 'SUSPENDED',
                rejectionReason: reason,
            },
        });

        // Revoke all vendor sessions
        await prisma.vendorSession.updateMany({
            where: { vendorId },
            data: { revoked: true },
        });

        logger.info('Vendor suspended', { vendorId, adminUserId, reason });

        // TODO: Send suspension notification email to vendor

        return updatedVendor;
    }

    /**
     * Handle vendor approval action
     */
    async handleApprovalAction(vendorId: string, adminUserId: string, dto: VendorApprovalDTO) {
        switch (dto.action) {
            case 'approve':
                return this.approveVendor(vendorId, adminUserId);
            case 'reject':
                return this.rejectVendor(vendorId, adminUserId, dto.reason);
            case 'suspend':
                return this.suspendVendor(vendorId, adminUserId, dto.reason);
            default:
                throw new AppError('Invalid action', 400, 'INVALID_ACTION');
        }
    }

    /**
     * Get vendor module dashboard stats
     */
    async getDashboardStats() {
        const [
            totalVendors,
            pendingVendors,
            approvedVendors,
            suspendedVendors,
            totalCategories,
            totalServices,
            totalBookings,
            completedBookings,
            totalReviews,
        ] = await Promise.all([
            prisma.vendor.count(),
            prisma.vendor.count({ where: { status: 'PENDING' } }),
            prisma.vendor.count({ where: { status: 'APPROVED' } }),
            prisma.vendor.count({ where: { status: 'SUSPENDED' } }),
            prisma.serviceCategory.count(),
            prisma.vendorService.count(),
            prisma.serviceBooking.count(),
            prisma.serviceBooking.count({ where: { status: 'COMPLETED' } }),
            prisma.serviceReview.count(),
        ]);

        // Recent pending vendors
        const recentPending = await prisma.vendor.findMany({
            where: { status: 'PENDING' },
            take: 5,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                businessName: true,
                ownerName: true,
                email: true,
                createdAt: true,
            },
        });

        // Recently approved
        const recentApproved = await prisma.vendor.findMany({
            where: { status: 'APPROVED' },
            take: 5,
            orderBy: { approvedAt: 'desc' },
            select: {
                id: true,
                businessName: true,
                approvedAt: true,
            },
        });

        // Top categories by services
        const topCategories = await prisma.serviceCategory.findMany({
            take: 5,
            orderBy: {
                services: {
                    _count: 'desc',
                },
            },
            select: {
                id: true,
                name: true,
                _count: {
                    select: { services: true },
                },
            },
        });

        return {
            stats: {
                vendors: {
                    total: totalVendors,
                    pending: pendingVendors,
                    approved: approvedVendors,
                    suspended: suspendedVendors,
                },
                categories: totalCategories,
                services: totalServices,
                bookings: {
                    total: totalBookings,
                    completed: completedBookings,
                },
                reviews: totalReviews,
            },
            recentPending,
            recentApproved,
            topCategories,
        };
    }

    /**
     * Get pending vendors for quick action
     */
    async getPendingVendors(page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where: { status: 'PENDING', isVerified: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'asc' }, // Oldest first
                select: {
                    id: true,
                    email: true,
                    phoneNumber: true,
                    businessName: true,
                    ownerName: true,
                    createdAt: true,
                    profile: {
                        select: {
                            description: true,
                            city: true,
                            state: true,
                            yearsExperience: true,
                        },
                    },
                },
            }),
            prisma.vendor.count({ where: { status: 'PENDING', isVerified: true } }),
        ]);

        return {
            vendors,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }
}

export const vendorAdminService = new VendorAdminService();
