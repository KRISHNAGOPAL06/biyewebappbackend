import { Request, Response, NextFunction } from 'express';
import { vendorServiceService } from './vendor-service.service.js';
import { sendSuccess } from '../../../utils/response.js';
import { ServiceSearchDTO } from '../vendor.dto.js';

class VendorServiceController {
    /**
     * Create new service
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const service = await vendorServiceService.create(vendorId, req.body);
            return sendSuccess(res, service, 'Service created successfully', 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vendor's own services
     */
    async getMyServices(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await vendorServiceService.getVendorServices(vendorId, page, limit);
            return sendSuccess(res, result, 'Services retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get service by ID (public)
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const service = await vendorServiceService.getById(id);
            return sendSuccess(res, service, 'Service retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update service
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const service = await vendorServiceService.update(vendorId, id, req.body);
            return sendSuccess(res, service, 'Service updated successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete service
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const result = await vendorServiceService.delete(vendorId, id);
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Toggle service availability
     */
    async toggleAvailability(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;
            const { id } = req.params;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const service = await vendorServiceService.toggleAvailability(vendorId, id);
            return sendSuccess(
                res,
                service,
                `Service ${service.isAvailable ? 'enabled' : 'disabled'} successfully`,
                200
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Search services (public)
     */
    async search(req: Request, res: Response, next: NextFunction) {
        try {
            const searchParams: ServiceSearchDTO = {
                categoryId: req.query.categoryId as string,
                city: req.query.city as string,
                minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
                maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
                minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
                isAvailable: req.query.isAvailable ? req.query.isAvailable === 'true' : undefined,
                search: req.query.search as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
                sortBy: (req.query.sortBy as 'price_asc' | 'price_desc' | 'rating' | 'newest') || 'newest',
            };

            const result = await vendorServiceService.search(searchParams);
            return sendSuccess(res, result, 'Services retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get services by category (public)
     */
    async getByCategory(req: Request, res: Response, next: NextFunction) {
        try {
            const { categoryId } = req.params;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await vendorServiceService.getByCategory(categoryId, page, limit);
            return sendSuccess(res, result, 'Services retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }
}

export const vendorServiceController = new VendorServiceController();
