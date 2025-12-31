import { Request, Response, NextFunction } from 'express';
import { bookingService } from './booking.service.js';
import { sendSuccess } from '../../../utils/response.js';

// BookingStatus type - matches Prisma enum
type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

class BookingController {
    /**
     * Create new booking (User only)
     */
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.userId;

            if (!userId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.create(userId, req.body);
            sendSuccess(res, booking, 'Booking request created successfully', 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get user's bookings
     */
    async getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.userId;

            if (!userId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const status = req.query.status as BookingStatus | undefined;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await bookingService.getUserBookings(userId, status, page, limit);
            sendSuccess(res, result, 'Bookings retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vendor's bookings
     */
    async getVendorBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const status = req.query.status as BookingStatus | undefined;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await bookingService.getVendorBookings(vendorId, status, page, limit);
            sendSuccess(res, result, 'Bookings retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get booking by ID (User)
     */
    async getByIdForUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.userId;
            const { id } = req.params;

            if (!userId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.getById(id, userId, 'user');
            sendSuccess(res, booking, 'Booking retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get booking by ID (Vendor)
     */
    async getByIdForVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.getById(id, vendorId, 'vendor');
            sendSuccess(res, booking, 'Booking retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Accept booking (Vendor only)
     */
    async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.accept(vendorId, id, req.body);
            sendSuccess(res, booking, 'Booking accepted successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject booking (Vendor only)
     */
    async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.reject(vendorId, id, req.body);
            sendSuccess(res, booking, 'Booking rejected', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Complete booking (Vendor only)
     */
    async complete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.complete(vendorId, id);
            sendSuccess(res, booking, 'Booking marked as completed', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel booking (User)
     */
    async cancelByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.userId;
            const { id } = req.params;

            if (!userId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.cancel(userId, 'user', id, req.body);
            sendSuccess(res, booking, 'Booking cancelled successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Cancel booking (Vendor)
     */
    async cancelByVendor(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const booking = await bookingService.cancel(vendorId, 'vendor', id, req.body);
            sendSuccess(res, booking, 'Booking cancelled successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vendor booking stats
     */
    async getVendorStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const stats = await bookingService.getVendorBookingStats(vendorId);
            sendSuccess(res, stats, 'Booking stats retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }
}

export const bookingController = new BookingController();
