import { PrismaClient } from '@prisma/client';
import { ReviewCreateDTO, ReviewReplyDTO } from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';
import { vendorServiceService } from '../services/vendor-service.service.js';

const prisma = new PrismaClient();

class ReviewService {
    /**
     * Create a review (User only, linked to completed booking)
     */
    async create(userId: string, dto: ReviewCreateDTO) {
        // Get booking
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: dto.bookingId },
            include: {
                service: {
                    select: { id: true, vendorId: true },
                },
                review: true,
            },
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        if (booking.userId !== userId) {
            throw new AppError('You can only review your own bookings', 403, 'FORBIDDEN');
        }

        if (booking.status !== 'COMPLETED') {
            throw new AppError('You can only review completed bookings', 400, 'BOOKING_NOT_COMPLETED');
        }

        if (booking.review) {
            throw new AppError('You have already reviewed this booking', 400, 'REVIEW_EXISTS');
        }

        // Create review
        const review = await prisma.serviceReview.create({
            data: {
                bookingId: dto.bookingId,
                serviceId: booking.serviceId,
                userId,
                vendorId: booking.vendorId,
                rating: dto.rating,
                title: dto.title,
                comment: dto.comment,
                images: dto.images || [],
            },
            include: {
                service: {
                    select: { id: true, title: true },
                },
            },
        });

        // Update service rating
        await vendorServiceService.updateRating(booking.serviceId);

        return review;
    }

    /**
     * Get reviews for a service
     */
    async getServiceReviews(serviceId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [reviews, total, stats] = await Promise.all([
            prisma.serviceReview.findMany({
                where: { serviceId, isVisible: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    rating: true,
                    title: true,
                    comment: true,
                    images: true,
                    vendorReply: true,
                    repliedAt: true,
                    createdAt: true,
                },
            }),
            prisma.serviceReview.count({ where: { serviceId, isVisible: true } }),
            prisma.serviceReview.aggregate({
                where: { serviceId, isVisible: true },
                _avg: { rating: true },
                _count: { rating: true },
            }),
        ]);

        // Get rating distribution
        const ratingDistribution = await prisma.serviceReview.groupBy({
            by: ['rating'],
            where: { serviceId, isVisible: true },
            _count: { rating: true },
        });

        const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingDistribution.forEach((r: { rating: number; _count: { rating: number } }) => {
            distribution[r.rating] = r._count.rating;
        });

        return {
            reviews,
            stats: {
                average: stats._avg.rating || 0,
                total: stats._count.rating,
                distribution,
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get reviews for a vendor
     */
    async getVendorReviews(vendorId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [reviews, total, stats] = await Promise.all([
            prisma.serviceReview.findMany({
                where: { vendorId, isVisible: true },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    service: {
                        select: { id: true, title: true },
                    },
                },
            }),
            prisma.serviceReview.count({ where: { vendorId, isVisible: true } }),
            prisma.serviceReview.aggregate({
                where: { vendorId, isVisible: true },
                _avg: { rating: true },
                _count: { rating: true },
            }),
        ]);

        return {
            reviews,
            stats: {
                average: stats._avg.rating || 0,
                total: stats._count.rating,
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Vendor reply to review
     */
    async reply(vendorId: string, reviewId: string, dto: ReviewReplyDTO) {
        const review = await prisma.serviceReview.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        if (review.vendorId !== vendorId) {
            throw new AppError('You can only reply to reviews for your services', 403, 'FORBIDDEN');
        }

        if (review.vendorReply) {
            throw new AppError('You have already replied to this review', 400, 'REPLY_EXISTS');
        }

        const updatedReview = await prisma.serviceReview.update({
            where: { id: reviewId },
            data: {
                vendorReply: dto.vendorReply,
                repliedAt: new Date(),
            },
        });

        return updatedReview;
    }

    /**
     * Get vendor's reviews (for vendor dashboard)
     */
    async getMyReviews(vendorId: string, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const [reviews, total, stats] = await Promise.all([
            prisma.serviceReview.findMany({
                where: { vendorId },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    service: {
                        select: { id: true, title: true },
                    },
                },
            }),
            prisma.serviceReview.count({ where: { vendorId } }),
            prisma.serviceReview.aggregate({
                where: { vendorId, isVisible: true },
                _avg: { rating: true },
                _count: { rating: true },
            }),
        ]);

        // Get unreplied reviews count
        const unreplied = await prisma.serviceReview.count({
            where: { vendorId, vendorReply: null },
        });

        return {
            reviews,
            stats: {
                average: stats._avg.rating || 0,
                total: stats._count.rating,
                unreplied,
            },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get review by ID
     */
    async getById(id: string) {
        const review = await prisma.serviceReview.findUnique({
            where: { id },
            include: {
                service: {
                    select: {
                        id: true,
                        title: true,
                        vendor: {
                            select: { id: true, businessName: true },
                        },
                    },
                },
                booking: {
                    select: { eventDate: true },
                },
            },
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        return review;
    }

    /**
     * Hide/show review (Admin only)
     */
    async toggleVisibility(reviewId: string) {
        const review = await prisma.serviceReview.findUnique({
            where: { id: reviewId },
        });

        if (!review) {
            throw new AppError('Review not found', 404, 'REVIEW_NOT_FOUND');
        }

        const updated = await prisma.serviceReview.update({
            where: { id: reviewId },
            data: { isVisible: !review.isVisible },
        });

        // Update service rating
        await vendorServiceService.updateRating(review.serviceId);

        return updated;
    }
}

export const reviewService = new ReviewService();
