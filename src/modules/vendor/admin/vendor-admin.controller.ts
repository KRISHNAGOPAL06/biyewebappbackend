import { Request, Response, NextFunction } from 'express';
import { vendorAdminService } from './vendor-admin.service.js';
import { sendSuccess } from '../../../utils/response.js';

// VendorStatus type - matches Prisma enum
type VendorStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

class VendorAdminController {
    /**
     * Get all vendors
     */
    async getVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const options = {
                status: req.query.status as VendorStatus | undefined,
                search: req.query.search as string,
                page: parseInt(req.query.page as string) || 1,
                limit: parseInt(req.query.limit as string) || 10,
            };

            const result = await vendorAdminService.getVendors(options);
            sendSuccess(res, result, 'Vendors retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get vendor details
     */
    async getVendorDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { id } = req.params;
            const vendor = await vendorAdminService.getVendorDetails(id);
            sendSuccess(res, vendor, 'Vendor details retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handle vendor approval action
     */
    async handleApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const adminUserId = req.userId;
            const { id } = req.params;

            if (!adminUserId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const vendor = await vendorAdminService.handleApprovalAction(id, adminUserId, req.body);

            const actionMessages: Record<string, string> = {
                APPROVED: 'Vendor approved successfully',
                REJECTED: 'Vendor rejected',
                SUSPENDED: 'Vendor suspended',
            };

            sendSuccess(res, vendor, actionMessages[vendor.status] || 'Action completed', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve vendor
     */
    async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const adminUserId = req.userId;
            const { id } = req.params;

            if (!adminUserId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const vendor = await vendorAdminService.approveVendor(id, adminUserId);
            sendSuccess(res, vendor, 'Vendor approved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject vendor
     */
    async reject(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const adminUserId = req.userId;
            const { id } = req.params;
            const { reason } = req.body;

            if (!adminUserId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const vendor = await vendorAdminService.rejectVendor(id, adminUserId, reason);
            sendSuccess(res, vendor, 'Vendor rejected', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Suspend vendor
     */
    async suspend(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const adminUserId = req.userId;
            const { id } = req.params;
            const { reason } = req.body;

            if (!adminUserId) {
                sendSuccess(res, null, 'Unauthorized', 401);
                return;
            }

            const vendor = await vendorAdminService.suspendVendor(id, adminUserId, reason);
            sendSuccess(res, vendor, 'Vendor suspended', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get dashboard stats
     */
    async getDashboardStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await vendorAdminService.getDashboardStats();
            sendSuccess(res, stats, 'Dashboard stats retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get pending vendors
     */
    async getPendingVendors(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            const result = await vendorAdminService.getPendingVendors(page, limit);
            sendSuccess(res, result, 'Pending vendors retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }
}

export const vendorAdminController = new VendorAdminController();
