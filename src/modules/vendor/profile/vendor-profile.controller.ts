import { Request, Response, NextFunction } from 'express';
import { vendorProfileService } from './vendor-profile.service.js';
import { sendSuccess } from '../../../utils/response.js';

class VendorProfileController {
    /**
     * Get own profile
     */
    async getMyProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const profile = await vendorProfileService.getProfile(vendorId);
            return sendSuccess(res, profile, 'Profile retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get public vendor profile
     */
    async getPublicProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const profile = await vendorProfileService.getPublicProfile(id);
            return sendSuccess(res, profile, 'Profile retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update profile
     */
    async updateProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const profile = await vendorProfileService.updateProfile(vendorId, req.body);
            return sendSuccess(res, profile, 'Profile updated successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update basic info
     */
    async updateBasicInfo(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const vendor = await vendorProfileService.updateBasicInfo(vendorId, req.body);
            return sendSuccess(res, vendor, 'Basic info updated successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Add gallery images
     */
    async addGalleryImages(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const { images } = req.body;
            const profile = await vendorProfileService.addGalleryImages(vendorId, images);
            return sendSuccess(res, profile, 'Images added successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Remove gallery image
     */
    async removeGalleryImage(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const { imageUrl } = req.body;
            const profile = await vendorProfileService.removeGalleryImage(vendorId, imageUrl);
            return sendSuccess(res, profile, 'Image removed successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get dashboard stats
     */
    async getDashboardStats(req: Request, res: Response, next: NextFunction) {
        try {
            const vendorId = req.vendorId;

            if (!vendorId) {
                return sendSuccess(res, null, 'Unauthorized', 401);
            }

            const stats = await vendorProfileService.getDashboardStats(vendorId);
            return sendSuccess(res, stats, 'Dashboard stats retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Search vendors (public)
     */
    async searchVendors(req: Request, res: Response, next: NextFunction) {
        try {
            const options = {
                city: req.query.city as string,
                categoryId: req.query.categoryId as string,
                search: req.query.search as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
            };

            const result = await vendorProfileService.searchVendors(options);
            return sendSuccess(res, result, 'Vendors retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }
}

export const vendorProfileController = new VendorProfileController();
