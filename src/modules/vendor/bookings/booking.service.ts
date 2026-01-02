// booking.service.ts
import { BookingCreateDTO, BookingRespondDTO, BookingCancelDTO } from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';
import { logger } from '../../../utils/logger.js';

// BookingStatus type - matches Prisma enum
type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

import { prisma } from '../../../config/db.js';

class BookingService {
    /**
     * Create a new booking request (User only)
     */
    async create(userId: string, dto: BookingCreateDTO) {
        // Get service details
        const service = await prisma.vendorService.findUnique({
            where: { id: dto.serviceId },
            include: {
                vendor: {
                    select: { id: true, status: true, isVerified: true, businessName: true },
                },
            },
        });

        if (!service) {
            throw new AppError('Service not found', 404, 'SERVICE_NOT_FOUND');
        }

        if (!service.isAvailable) {
            throw new AppError('This service is currently unavailable', 400, 'SERVICE_UNAVAILABLE');
        }

        if (service.vendor.status !== 'APPROVED' || !service.vendor.isVerified) {
            throw new AppError('This vendor is not available for bookings', 400, 'VENDOR_UNAVAILABLE');
        }

        // Check if event date is in the future
        const eventDate = new Date(dto.eventDate);
        if (eventDate <= new Date()) {
            throw new AppError('Event date must be in the future', 400, 'INVALID_EVENT_DATE');
        }

        // Check capacity if specified
        if (dto.guestCount) {
            if (service.minCapacity && dto.guestCount < service.minCapacity) {
                throw new AppError(
                    `Minimum guest count for this service is ${service.minCapacity}`,
                    400,
                    'BELOW_MIN_CAPACITY'
                );
            }
            if (service.maxCapacity && dto.guestCount > service.maxCapacity) {
                throw new AppError(
                    `Maximum guest count for this service is ${service.maxCapacity}`,
                    400,
                    'ABOVE_MAX_CAPACITY'
                );
            }
        }

        const booking = await prisma.serviceBooking.create({
            data: {
                serviceId: dto.serviceId,
                userId,
                vendorId: service.vendorId,
                eventDate,
                eventTime: dto.eventTime,
                eventLocation: dto.eventLocation,
                guestCount: dto.guestCount,
                requirements: dto.requirements,
                userNotes: dto.userNotes,
                status: 'PENDING',
            },
            include: {
                service: {
                    select: {
                        id: true,
                        title: true,
                        basePrice: true,
                        currency: true,
                        priceUnit: true,
                        vendor: {
                            select: { id: true, businessName: true },
                        },
                    },
                },
            },
        });

        // TODO: Send notification to vendor about new booking request

        return booking;
    }

    /**
     * Get user's bookings
     */
    async getUserBookings(userId: string, status?: BookingStatus, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const where: any = { userId };
        if (status) {
            where.status = status;
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
                            id: true,
                            title: true,
                            images: true,
                            basePrice: true,
                            currency: true,
                            vendor: {
                                select: {
                                    id: true,
                                    businessName: true,
                                    profile: {
                                        select: { logo: true },
                                    },
                                },
                            },
                        },
                    },
                    review: {
                        select: { id: true, rating: true },
                    },
                },
            }),
            prisma.serviceBooking.count({ where }),
        ]);

        return {
            bookings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get vendor's bookings
     */
    async getVendorBookings(vendorId: string, status?: BookingStatus, page = 1, limit = 10) {
        const skip = (page - 1) * limit;

        const where: any = { vendorId };
        if (status) {
            where.status = status;
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
                            id: true,
                            title: true,
                            images: true,
                            basePrice: true,
                            currency: true,
                        },
                    },
                },
            }),
            prisma.serviceBooking.count({ where }),
        ]);

        return {
            bookings,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get booking by ID
     */
    async getById(id: string, requesterId: string, requesterType: 'user' | 'vendor') {
        const booking = await prisma.serviceBooking.findUnique({
            where: { id },
            include: {
                service: {
                    include: {
                        category: {
                            select: { id: true, name: true },
                        },
                        vendor: {
                            select: {
                                id: true,
                                businessName: true,
                                ownerName: true,
                                phoneNumber: true,
                                email: true,
                                profile: {
                                    select: { logo: true, city: true, state: true },
                                },
                            },
                        },
                    },
                },
                review: true,
            },
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        // Verify access
        if (requesterType === 'user' && booking.userId !== requesterId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }
        if (requesterType === 'vendor' && booking.vendorId !== requesterId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        return booking;
    }

    /**
     * Accept booking (Vendor only)
     */
    async accept(vendorId: string, bookingId: string, dto: BookingRespondDTO) {
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        if (booking.vendorId !== vendorId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        if (booking.status !== 'PENDING') {
            throw new AppError(
                `Cannot accept booking with status: ${booking.status}`,
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }

        const updatedBooking = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                status: 'ACCEPTED',
                vendorNotes: dto.vendorNotes,
                totalAmount: dto.totalAmount,
                respondedAt: new Date(),
            },
            include: {
                service: {
                    select: { title: true },
                },
            },
        });

        // TODO: Send notification to user about accepted booking

        return updatedBooking;
    }

    /**
     * Reject booking (Vendor only)
     */
    async reject(vendorId: string, bookingId: string, dto: BookingRespondDTO) {
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        if (booking.vendorId !== vendorId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        if (booking.status !== 'PENDING') {
            throw new AppError(
                `Cannot reject booking with status: ${booking.status}`,
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }

        const updatedBooking = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                status: 'REJECTED',
                vendorNotes: dto.vendorNotes,
                respondedAt: new Date(),
            },
        });

        // TODO: Send notification to user about rejected booking

        return updatedBooking;
    }

    /**
     * Mark booking as completed (Vendor only)
     */
    async complete(vendorId: string, bookingId: string) {
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        if (booking.vendorId !== vendorId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        if (booking.status !== 'ACCEPTED') {
            throw new AppError(
                'Only accepted bookings can be marked as completed',
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }

        // Check if event date has passed
        if (booking.eventDate > new Date()) {
            throw new AppError(
                'Cannot mark as completed before the event date',
                400,
                'EVENT_NOT_HAPPENED'
            );
        }

        const updatedBooking = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });

        // TODO: Send notification to user to leave a review

        return updatedBooking;
    }

    /**
     * Cancel booking (User or Vendor)
     */
    async cancel(
        requesterId: string,
        requesterType: 'user' | 'vendor',
        bookingId: string,
        dto: BookingCancelDTO
    ) {
        const booking = await prisma.serviceBooking.findUnique({
            where: { id: bookingId },
        });

        if (!booking) {
            throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
        }

        // Verify access
        if (requesterType === 'user' && booking.userId !== requesterId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }
        if (requesterType === 'vendor' && booking.vendorId !== requesterId) {
            throw new AppError('Access denied', 403, 'FORBIDDEN');
        }

        // Check if can be cancelled
        if (!['PENDING', 'ACCEPTED'].includes(booking.status)) {
            throw new AppError(
                `Cannot cancel booking with status: ${booking.status}`,
                400,
                'INVALID_STATUS_TRANSITION'
            );
        }

        const updatedBooking = await prisma.serviceBooking.update({
            where: { id: bookingId },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
                cancelReason: dto.cancelReason,
            },
        });

        // TODO: Send notification about cancellation

        return updatedBooking;
    }

    /**
     * Get booking stats for vendor dashboard
     */
    async getVendorBookingStats(vendorId: string) {
        const [pending, accepted, completed, cancelled, rejected] = await Promise.all([
            prisma.serviceBooking.count({ where: { vendorId, status: 'PENDING' } }),
            prisma.serviceBooking.count({ where: { vendorId, status: 'ACCEPTED' } }),
            prisma.serviceBooking.count({ where: { vendorId, status: 'COMPLETED' } }),
            prisma.serviceBooking.count({ where: { vendorId, status: 'CANCELLED' } }),
            prisma.serviceBooking.count({ where: { vendorId, status: 'REJECTED' } }),
        ]);

        // Upcoming bookings
        const upcoming = await prisma.serviceBooking.findMany({
            where: {
                vendorId,
                status: 'ACCEPTED',
                eventDate: { gte: new Date() },
            },
            take: 5,
            orderBy: { eventDate: 'asc' },
            include: {
                service: {
                    select: { title: true },
                },
            },
        });

        return {
            counts: {
                pending,
                accepted,
                completed,
                cancelled,
                rejected,
                total: pending + accepted + completed + cancelled + rejected,
            },
            upcoming,
        };
    }
}

export const bookingService = new BookingService();
