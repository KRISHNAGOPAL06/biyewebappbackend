// admin.service.ts
import {
    DashboardStats,
    UserListItem,
    VendorListItem,
    BookingListItem,
    ActivityLogItem,
    PaginationParams,
    PaginatedResponse
} from './admin.types';

import { prisma } from '../../config/db.js';

export class AdminService {
    // Dashboard Stats
    async getDashboardStats(): Promise<DashboardStats> {
        try {
            const [totalUsers, totalVendors, totalBookings] = await Promise.all([
                prisma.user.count(),
                prisma.vendor.count(),
                prisma.serviceBooking.count()
            ]);

            // Calculate total revenue (sum of all completed bookings)
            const revenueData = await prisma.serviceBooking.aggregate({
                where: {
                    status: 'COMPLETED'
                },
                _sum: {
                    totalAmount: true
                }
            });

            const totalRevenue = revenueData._sum.totalAmount || 0;

            return {
                totalUsers,
                totalVendors,
                totalBookings,
                totalRevenue: Number(totalRevenue),
                trends: {
                    users: '+12%',
                    vendors: '+8%',
                    bookings: '-3%',
                    revenue: '+15%'
                }
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    }

    // User Management
    async getUsers(params: PaginationParams): Promise<PaginatedResponse<UserListItem>> {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.search) {
            where.OR = [
                { firstName: { contains: params.search, mode: 'insensitive' } },
                { lastName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } }
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                    phoneNumber: true,
                    role: true,
                    createdAt: true
                }
            }),
            prisma.user.count({ where })
        ]);

        return {
            data: users.map(user => ({
                id: user.id,
                fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
                email: user.email,
                phoneNumber: user.phoneNumber || undefined,
                role: user.role,
                status: 'ACTIVE', // Default since User model doesn't have status field
                createdAt: user.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getUserById(id: string) {
        return await prisma.user.findUnique({
            where: { id },
            include: {
                profile: true
            }
        });
    }

    async updateUser(id: string, data: { status?: string; role?: string }) {
        // Update only role since User model doesn't have status field
        return await prisma.user.update({
            where: { id },
            data: {
                role: data.role
            }
        });
    }

    async deleteUser(id: string) {
        try {
            return await prisma.$transaction(async (tx) => {
                // 1. Delete CandidateLinks where user is parent or child
                await tx.candidateLink.deleteMany({
                    where: {
                        OR: [
                            { parentUserId: id },
                            { childUserId: id }
                        ]
                    }
                });

                // 2. Delete the user (other relations have Cascade delete in schema)
                return await tx.user.delete({
                    where: { id }
                });
            });
        } catch (error) {
            console.error('Transaction failed in deleteUser:', error);
            throw error;
        }
    }

    // Vendor Management
    async getVendors(params: PaginationParams): Promise<PaginatedResponse<VendorListItem>> {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.status) {
            where.onboardingStatus = params.status;
        }
        if (params.search) {
            where.OR = [
                { businessName: { contains: params.search, mode: 'insensitive' } },
                { ownerName: { contains: params.search, mode: 'insensitive' } },
                { email: { contains: params.search, mode: 'insensitive' } }
            ];
        }

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    profile: {
                        select: {
                            category: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.vendor.count({ where })
        ]);

        return {
            data: vendors.map(vendor => ({
                id: vendor.id,
                businessName: vendor.businessName,
                email: vendor.email,
                category: vendor.profile?.category?.name,
                onboardingStatus: vendor.onboardingStatus,
                createdAt: vendor.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getVendorById(id: string) {
        return await prisma.vendor.findUnique({
            where: { id },
            include: {
                profile: {
                    include: {
                        category: {
                            select: {
                                name: true,
                                id: true
                            }
                        }
                    }
                }
            }
        });
    }

    async updateVendorStatus(id: string, status: string) {
        return await prisma.vendor.update({
            where: { id },
            data: { onboardingStatus: status as any }
        });
    }

    async deleteVendor(id: string) {
        return await prisma.vendor.delete({
            where: { id }
        });
    }

    // Booking Management
    async getBookings(params: PaginationParams): Promise<PaginatedResponse<BookingListItem>> {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (params.status) {
            where.status = params.status;
        }

        const [bookings, total] = await Promise.all([
            prisma.serviceBooking.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    service: {
                        select: {
                            title: true,
                            vendor: {
                                select: {
                                    businessName: true
                                }
                            }
                        }
                    }
                }
            }),
            prisma.serviceBooking.count({ where })
        ]);

        return {
            data: bookings.map(booking => ({
                id: booking.id,
                customerName: booking.userId, // Will need to join User later
                vendorName: booking.service.vendor.businessName,
                serviceName: booking.service.title,
                bookingDate: booking.eventDate,
                status: booking.status,
                amount: Number(booking.totalAmount || 0)
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getBookingById(id: string) {
        return await prisma.serviceBooking.findUnique({
            where: { id },
            include: {
                service: {
                    include: {
                        vendor: true
                    }
                }
            }
        });
    }

    async updateBookingStatus(id: string, status: string) {
        return await prisma.serviceBooking.update({
            where: { id },
            data: { status: status as any }
        });
    }

    // Activity Log
    async getRecentActivity(limit: number = 10): Promise<ActivityLogItem[]> {
        // Get recent users
        const recentUsers = await prisma.user.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                firstName: true,
                lastName: true,
                createdAt: true
            }
        });

        // Get recent vendors
        const recentVendors = await prisma.vendor.findMany({
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                businessName: true,
                ownerName: true,
                createdAt: true
            }
        });

        // Get recent bookings
        const recentBookings = await prisma.serviceBooking.findMany({
            take: 4,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                userId: true,
                createdAt: true
            }
        });

        const activities: ActivityLogItem[] = [];

        recentUsers.forEach(user => {
            const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
            activities.push({
                id: user.id,
                userId: user.id,
                userName,
                action: 'Registered as new user',
                type: 'USER',
                timestamp: user.createdAt
            });
        });

        recentVendors.forEach(vendor => {
            activities.push({
                id: vendor.id,
                userId: vendor.id,
                userName: vendor.businessName,
                action: 'Submitted for vendor approval',
                type: 'VENDOR',
                timestamp: vendor.createdAt
            });
        });

        recentBookings.forEach(booking => {
            activities.push({
                id: booking.id,
                userId: booking.userId,
                userName: 'User', // Would need to join to get actual name
                action: 'Created new booking',
                type: 'BOOKING',
                timestamp: booking.createdAt
            });
        });

        // Sort by timestamp and return latest
        return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    // Plan Management
    async getPlans() {
        try {
            const plans = await prisma.plan.findMany({
                orderBy: { price: 'asc' }
            });
            return plans;
        } catch (error) {
            console.error('Error fetching plans:', error);
            throw error;
        }
    }

    async getPlanById(id: string) {
        try {
            const plan = await prisma.plan.findUnique({
                where: { id },
                include: {
                    subscriptions: {
                        take: 5,
                        orderBy: { createdAt: 'desc' }
                    }
                }
            });
            return plan;
        } catch (error) {
            console.error('Error fetching plan:', error);
            throw error;
        }
    }

    async createPlan(data: {
        code: string;
        name: string;
        price: number;
        durationDays: number;
        features: any;
        isInviteOnly?: boolean;
        category?: string;
    }) {
        try {
            const plan = await prisma.plan.create({
                data: {
                    code: data.code,
                    name: data.name,
                    price: data.price,
                    durationDays: data.durationDays,
                    features: data.features,
                    isInviteOnly: data.isInviteOnly || false,
                    category: data.category || 'subscription'
                }
            });
            return plan;
        } catch (error) {
            console.error('Error creating plan:', error);
            throw error;
        }
    }

    async updatePlan(id: string, data: {
        code?: string;
        name?: string;
        price?: number;
        durationDays?: number;
        features?: any;
        isInviteOnly?: boolean;
        category?: string;
        discountPercent?: number;
        discountAmount?: number;
        couponCode?: string;
        couponValidUntil?: string;
    }) {
        try {
            // Only extract valid Plan model fields to prevent Prisma errors
            const validData: any = {};
            if (data.code !== undefined) validData.code = data.code;
            if (data.name !== undefined) validData.name = data.name;
            if (data.price !== undefined) validData.price = data.price;
            if (data.durationDays !== undefined) validData.durationDays = data.durationDays;
            if (data.features !== undefined) validData.features = data.features;
            if (data.isInviteOnly !== undefined) validData.isInviteOnly = data.isInviteOnly;
            if (data.category !== undefined) validData.category = data.category;
            if (data.discountPercent !== undefined) validData.discountPercent = data.discountPercent;
            if (data.discountAmount !== undefined) validData.discountAmount = data.discountAmount;
            if (data.couponCode !== undefined) validData.couponCode = data.couponCode;
            if (data.couponValidUntil !== undefined) validData.couponValidUntil = data.couponValidUntil ? new Date(data.couponValidUntil) : null;

            const plan = await prisma.plan.update({
                where: { id },
                data: validData
            });
            return plan;
        } catch (error) {
            console.error('Error updating plan:', error);
            throw error;
        }
    }

    async deletePlan(id: string) {
        try {
            // Check if plan has active subscriptions
            const subscriptionCount = await prisma.subscription.count({
                where: { planId: id }
            });

            if (subscriptionCount > 0) {
                throw new Error('Cannot delete plan with active subscriptions');
            }

            await prisma.plan.delete({
                where: { id }
            });
            return { success: true };
        } catch (error) {
            console.error('Error deleting plan:', error);
            throw error;
        }
    }
}
