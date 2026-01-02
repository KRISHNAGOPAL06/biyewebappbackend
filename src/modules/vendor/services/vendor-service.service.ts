import { Prisma } from '@prisma/client';
import { VendorServiceCreateDTO, VendorServiceUpdateDTO, ServiceSearchDTO } from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';

import { prisma } from '../../../config/db.js';

class VendorServiceService {
    /**
     * Create a new service
     */
    async create(vendorId: string, dto: VendorServiceCreateDTO) {
        // Verify category exists and is active
        const category = await prisma.serviceCategory.findUnique({
            where: { id: dto.categoryId },
        });

        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        if (!category.isActive) {
            throw new AppError('This category is not available', 400, 'CATEGORY_INACTIVE');
        }

        const service = await prisma.vendorService.create({
            data: {
                vendorId,
                categoryId: dto.categoryId,
                title: dto.title,
                description: dto.description,
                images: dto.images || [],
                basePrice: dto.basePrice,
                currency: dto.currency || 'INR',
                priceUnit: dto.priceUnit || 'per_event',
                minCapacity: dto.minCapacity,
                maxCapacity: dto.maxCapacity,
                duration: dto.duration,
                inclusions: dto.inclusions || [],
                exclusions: dto.exclusions || [],
                isAvailable: dto.isAvailable ?? true,
            },
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
                vendor: {
                    select: { id: true, businessName: true },
                },
            },
        });

        return service;
    }

    /**
     * Get vendor's own services
     */
    async getVendorServices(vendorId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [services, total] = await Promise.all([
            prisma.vendorService.findMany({
                where: { vendorId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    _count: {
                        select: { bookings: true, reviews: true },
                    },
                },
            }),
            prisma.vendorService.count({ where: { vendorId } }),
        ]);

        return {
            services,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get service by ID
     */
    async getById(id: string) {
        const service = await prisma.vendorService.findUnique({
            where: { id },
            include: {
                category: {
                    select: { id: true, name: true, slug: true, icon: true },
                },
                vendor: {
                    select: {
                        id: true,
                        businessName: true,
                        ownerName: true,
                        status: true,
                        profile: {
                            select: {
                                logo: true,
                                city: true,
                                state: true,
                                yearsExperience: true,
                            },
                        },
                    },
                },
                _count: {
                    select: { bookings: true, reviews: true },
                },
            },
        });

        if (!service) {
            throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
        }

        return service;
    }

    /**
     * Update service (vendor can only update their own)
     */
    async update(vendorId: string, serviceId: string, dto: VendorServiceUpdateDTO) {
        const existing = await prisma.vendorService.findUnique({
            where: { id: serviceId },
        });

        if (!existing) {
            throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
        }

        if (existing.vendorId !== vendorId) {
            throw new AppError('You can only update your own services', 403, 'FORBIDDEN');
        }

        // If category is being changed, verify it exists and is active
        if (dto.categoryId && dto.categoryId !== existing.categoryId) {
            const category = await prisma.serviceCategory.findUnique({
                where: { id: dto.categoryId },
            });

            if (!category) {
                throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            if (!category.isActive) {
                throw new AppError('This category is not available', 400, 'CATEGORY_INACTIVE');
            }
        }

        const service = await prisma.vendorService.update({
            where: { id: serviceId },
            data: dto,
            include: {
                category: {
                    select: { id: true, name: true, slug: true },
                },
            },
        });

        return service;
    }

    /**
     * Delete service (vendor can only delete their own)
     */
    async delete(vendorId: string, serviceId: string) {
        const existing = await prisma.vendorService.findUnique({
            where: { id: serviceId },
            include: {
                _count: {
                    select: { bookings: { where: { status: { in: ['PENDING', 'ACCEPTED'] } } } },
                },
            },
        });

        if (!existing) {
            throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
        }

        if (existing.vendorId !== vendorId) {
            throw new AppError('You can only delete your own services', 403, 'FORBIDDEN');
        }

        if (existing._count.bookings > 0) {
            throw new AppError(
                'Cannot delete service with active bookings. Please complete or cancel existing bookings first.',
                400,
                'SERVICE_HAS_ACTIVE_BOOKINGS'
            );
        }

        await prisma.vendorService.delete({
            where: { id: serviceId },
        });

        return { message: 'Service deleted successfully' };
    }

    /**
     * Toggle service availability
     */
    async toggleAvailability(vendorId: string, serviceId: string) {
        const existing = await prisma.vendorService.findUnique({
            where: { id: serviceId },
        });

        if (!existing) {
            throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
        }

        if (existing.vendorId !== vendorId) {
            throw new AppError('You can only update your own services', 403, 'FORBIDDEN');
        }

        const service = await prisma.vendorService.update({
            where: { id: serviceId },
            data: { isAvailable: !existing.isAvailable },
        });

        return service;
    }

    /**
     * Search and filter services (public)
     */
    async search(dto: ServiceSearchDTO) {
        const { page = 1, limit = 10 } = dto;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: Prisma.VendorServiceWhereInput = {
            isAvailable: dto.isAvailable ?? true,
            vendor: {
                status: 'APPROVED',
                isVerified: true,
            },
        };

        if (dto.categoryId) {
            where.categoryId = dto.categoryId;
        }

        if (dto.minPrice !== undefined || dto.maxPrice !== undefined) {
            where.basePrice = {};
            if (dto.minPrice !== undefined) {
                where.basePrice.gte = dto.minPrice;
            }
            if (dto.maxPrice !== undefined) {
                where.basePrice.lte = dto.maxPrice;
            }
        }

        if (dto.minRating !== undefined) {
            where.avgRating = { gte: dto.minRating };
        }

        if (dto.city) {
            where.vendor = {
                ...where.vendor as any,
                profile: {
                    city: { contains: dto.city, mode: 'insensitive' },
                },
            };
        }

        if (dto.search) {
            where.OR = [
                { title: { contains: dto.search, mode: 'insensitive' } },
                { description: { contains: dto.search, mode: 'insensitive' } },
                { vendor: { businessName: { contains: dto.search, mode: 'insensitive' } } },
            ];
        }

        // Build order by
        let orderBy: Prisma.VendorServiceOrderByWithRelationInput = { createdAt: 'desc' };

        switch (dto.sortBy) {
            case 'price_asc':
                orderBy = { basePrice: 'asc' };
                break;
            case 'price_desc':
                orderBy = { basePrice: 'desc' };
                break;
            case 'rating':
                orderBy = { avgRating: 'desc' };
                break;
            case 'newest':
            default:
                orderBy = { createdAt: 'desc' };
        }

        const [services, total] = await Promise.all([
            prisma.vendorService.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    vendor: {
                        select: {
                            id: true,
                            businessName: true,
                            profile: {
                                select: {
                                    logo: true,
                                    city: true,
                                    state: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.vendorService.count({ where }),
        ]);

        return {
            services,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get services by category
     */
    async getByCategory(categoryId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const category = await prisma.serviceCategory.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        const [services, total] = await Promise.all([
            prisma.vendorService.findMany({
                where: {
                    categoryId,
                    isAvailable: true,
                    vendor: {
                        status: 'APPROVED',
                        isVerified: true,
                    },
                },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    category: {
                        select: { id: true, name: true, slug: true },
                    },
                    vendor: {
                        select: {
                            id: true,
                            businessName: true,
                            profile: {
                                select: {
                                    logo: true,
                                    city: true,
                                    state: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.vendorService.count({
                where: {
                    categoryId,
                    isAvailable: true,
                    vendor: { status: 'APPROVED', isVerified: true },
                },
            }),
        ]);

        return {
            category,
            services,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Update service rating (internal - called after review)
     */
    async updateRating(serviceId: string) {
        const result = await prisma.serviceReview.aggregate({
            where: { serviceId, isVisible: true },
            _avg: { rating: true },
            _count: { rating: true },
        });

        await prisma.vendorService.update({
            where: { id: serviceId },
            data: {
                avgRating: result._avg.rating || null,
                reviewCount: result._count.rating,
            },
        });
    }
}

export const vendorServiceService = new VendorServiceService();
