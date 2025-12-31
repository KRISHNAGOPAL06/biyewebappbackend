import { Request, Response, NextFunction } from 'express';
import { reviewService } from './review.service.js';
import { sendSuccess } from '../../../utils/response.js';

class ReviewController {
    /**
     * Create review (User only)
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId;

            if (!userId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const review = await reviewService.create(userId, req.body);
            return sendSuccess(res, review, 'Review submitted successfully', 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get service reviews (Public)
     */
    async getServiceReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const { serviceId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await reviewService.getServiceReviews(serviceId, page, limit);
            return sendSuccess(res, result, 'Reviews retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vendor reviews (Public)
     */
    async getVendorReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const { vendorId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await reviewService.getVendorReviews(vendorId, page, limit);
            return sendSuccess(res, result, 'Reviews retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reply to review (Vendor only)
     */
    async reply(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const review = await reviewService.reply(vendorId, id, req.body);
            return sendSuccess(res, review, 'Reply added successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get my reviews (Vendor dashboard)
     */
    async getMyReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await reviewService.getMyReviews(vendorId, page, limit);
            return sendSuccess(res, result, 'Reviews retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get review by ID
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const review = await reviewService.getById(id);
            return sendSuccess(res, review, 'Review retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Toggle review visibility (Admin only)
     */
    async toggleVisibility(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const review = await reviewService.toggleVisibility(id);
            return sendSuccess(
                res,
                review,
                `Review ${review.isVisible ? 'shown' : 'hidden'} successfully`,
                200
            );
        } catch (error) {
            next(error);
        }
    }
}

export const reviewController = new ReviewController();
