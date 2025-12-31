import { PrismaClient } from '@prisma/client';
import { VendorProfileUpdateDTO } from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';

const prisma = new PrismaClient();

class VendorProfileService {
    /**
     * Get vendor profile
     */
    async getProfile(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: {
                profile: true,
                _count: {
                    select: { services: true },
                },
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
     * Get public vendor profile (for users)
     */
    async getPublicProfile(vendorId: string) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            select: {
                id: true,
                businessName: true,
                ownerName: true,
                status: true,
                createdAt: true,
                profile: true,
                services: {
                    where: { isAvailable: true },
                    take: 6,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        category: {
                            select: { id: true, name: true, slug: true },
                        },
                    },
                },
                _count: {
                    select: { services: true },
                },
            },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        if (vendor.status !== 'APPROVED') {
            throw new AppError('Vendor profile is not available', 404, 'VENDOR_NOT_AVAILABLE');
        }

        // Get vendor's overall rating
        const ratingStats = await prisma.serviceReview.aggregate({
            where: {
                vendorId,
                isVisible: true,
            },
            _avg: { rating: true },
            _count: { rating: true },
        });

        return {
            ...vendor,
            rating: {
                average: ratingStats._avg.rating,
                count: ratingStats._count.rating,
            },
        };
    }

    /**
     * Update vendor profile
     */
    async updateProfile(vendorId: string, dto: VendorProfileUpdateDTO) {
        const vendor = await prisma.vendor.findUnique({
            where: { id: vendorId },
            include: { profile: true },
        });

        if (!vendor) {
            throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        // Prepare update data
        const updateData: any = {
            description: dto.description,
            logo: dto.logo,
            coverImage: dto.coverImage,
            images: dto.images,
            address: dto.address,
            city: dto.city,
            state: dto.state,
            country: dto.country,
            pincode: dto.pincode,
            yearsExperience: dto.yearsExperience,
            teamSize: dto.teamSize,
            website: dto.website,
            serviceRegion: dto.serviceRegion,
            citiesServed: dto.citiesServed,
            shipsInternationally: dto.shipsInternationally,
            socialLinks: dto.socialLinks,
            workingHours: dto.workingHours,
        };

        // Handle latitude/longitude
        if (dto.latitude !== undefined) {
            updateData.latitude = dto.latitude;
        }
        if (dto.longitude !== undefined) {
            updateData.longitude = dto.longitude;
        }

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        const profile = await prisma.vendorProfile.update({
            where: { vendorId },
            data: updateData,
        });

        return profile;
    }

    /**
     * Update vendor basic info (business name, owner name, phone)
     */
    async updateBasicInfo(vendorId: string, data: { businessName?: string; ownerName?: string; phoneNumber?: string }) {
        const vendor = await prisma.vendor.update({
            where: { id: vendorId },
            data,
            select: {
                id: true,
                email: true,
                businessName: true,
                ownerName: true,
                phoneNumber: true,
                status: true,
            },
        });

        return vendor;
    }

    /**
     * Add images to gallery
     */
    async addGalleryImages(vendorId: string, imageUrls: string[]) {
        const profile = await prisma.vendorProfile.findUnique({
            where: { vendorId },
        });

        if (!profile) {
            throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        const currentImages = profile.images || [];
        const newImages = [...currentImages, ...imageUrls].slice(0, 20); // Max 20 images

        const updatedProfile = await prisma.vendorProfile.update({
            where: { vendorId },
            data: { images: newImages },
        });

        return updatedProfile;
    }

    /**
     * Remove image from gallery
     */
    async removeGalleryImage(vendorId: string, imageUrl: string) {
        const profile = await prisma.vendorProfile.findUnique({
            where: { vendorId },
        });

        if (!profile) {
            throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND');
        }

        const newImages = (profile.images || []).filter(img => img !== imageUrl);

        const updatedProfile = await prisma.vendorProfile.update({
            where: { vendorId },
            data: { images: newImages },
        });

        return updatedProfile;
    }

    /**
     * Get vendor dashboard stats
     */
    async getDashboardStats(vendorId: string) {
        const [
            totalServices,
            totalBookings,
            pendingBookings,
            completedBookings,
            totalRevenue,
            avgRating,
        ] = await Promise.all([
            prisma.vendorService.count({ where: { vendorId } }),
            prisma.serviceBooking.count({ where: { vendorId } }),
            prisma.serviceBooking.count({ where: { vendorId, status: 'PENDING' } }),
            prisma.serviceBooking.count({ where: { vendorId, status: 'COMPLETED' } }),
            prisma.serviceBooking.aggregate({
                where: { vendorId, status: 'COMPLETED' },
                _sum: { totalAmount: true },
            }),
            prisma.serviceReview.aggregate({
                where: { vendorId, isVisible: true },
                _avg: { rating: true },
                _count: { rating: true },
            }),
        ]);

        // Recent bookings
        const recentBookings = await prisma.serviceBooking.findMany({
            where: { vendorId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                service: {
                    select: { title: true },
                },
            },
        });

        // Recent reviews
        const recentReviews = await prisma.serviceReview.findMany({
            where: { vendorId },
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                service: {
                    select: { title: true },
                },
            },
        });

        return {
            stats: {
                totalServices,
                totalBookings,
                pendingBookings,
                completedBookings,
                totalRevenue: totalRevenue._sum.totalAmount || 0,
                avgRating: avgRating._avg.rating || 0,
                reviewCount: avgRating._count.rating,
            },
            recentBookings,
            recentReviews,
        };
    }

    /**
     * Search vendors (public)
     */
    async searchVendors(options: {
        city?: string;
        categoryId?: string;
        search?: string;
        page?: number;
        limit?: number;
    }) {
        const { page = 1, limit = 10 } = options;
        const skip = (page - 1) * limit;

        const where: any = {
            status: 'APPROVED',
            isVerified: true,
        };

        if (options.city) {
            where.profile = {
                city: { contains: options.city, mode: 'insensitive' },
            };
        }

        if (options.categoryId) {
            where.services = {
                some: {
                    categoryId: options.categoryId,
                    isAvailable: true,
                },
            };
        }

        if (options.search) {
            where.OR = [
                { businessName: { contains: options.search, mode: 'insensitive' } },
                { ownerName: { contains: options.search, mode: 'insensitive' } },
            ];
        }

        const [vendors, total] = await Promise.all([
            prisma.vendor.findMany({
                where,
                skip,
                take: limit,
                select: {
                    id: true,
                    businessName: true,
                    ownerName: true,
                    createdAt: true,
                    profile: {
                        select: {
                            logo: true,
                            city: true,
                            state: true,
                            yearsExperience: true,
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
}

export const vendorProfileService = new VendorProfileService();
