import { Request, Response } from 'express';
import { AdminService } from './admin.service.js';
import {
    paginationSchema,
    userUpdateSchema,
    vendorStatusSchema,
    bookingStatusSchema
} from './admin.validation.js';

const adminService = new AdminService();

export class AdminController {
    // Dashboard Stats
    async getStats(req: Request, res: Response) {
        try {
            const stats = await adminService.getDashboardStats();
            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            console.error('Get stats error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch dashboard stats',
                    details: error.message
                }
            });
        }
    }

    // User Management
    async getUsers(req: Request, res: Response) {
        try {
            const params = paginationSchema.parse(req.query);
            const result = await adminService.getUsers(params);
            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch users',
                    details: error.message
                }
            });
        }
    }

    async getUserById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const user = await adminService.getUserById(id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'User not found'
                    }
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error: any) {
            console.error('Get user error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch user',
                    details: error.message
                }
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const data = userUpdateSchema.parse(req.body);
            const user = await adminService.updateUser(id, data);

            res.json({
                success: true,
                data: user,
                message: 'User updated successfully'
            });
        } catch (error: any) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to update user',
                    details: error.message
                }
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await adminService.deleteUser(id);

            res.json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error: any) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to delete user',
                    details: error.message
                }
            });
        }
    }

    // Vendor Management
    async getVendors(req: Request, res: Response) {
        try {
            const params = paginationSchema.parse(req.query);
            const result = await adminService.getVendors(params);
            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get vendors error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch vendors',
                    details: error.message
                }
            });
        }
    }

    async getVendorById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const vendor = await adminService.getVendorById(id);

            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Vendor not found' }
                });
            }

            // Convert BigInt fields to strings to avoid serialization issues
            const vendorData = JSON.parse(JSON.stringify(vendor, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            res.json({
                success: true,
                data: vendorData
            });
        } catch (error: any) {
            console.error('Get vendor error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch vendor',
                    details: error.message
                }
            });
        }
    }

    async updateVendorStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = vendorStatusSchema.parse(req.body);
            const vendor = await adminService.updateVendorStatus(id, status);

            res.json({
                success: true,
                data: vendor,
                message: `Vendor ${status.toLowerCase()} successfully`
            });
        } catch (error: any) {
            console.error('Update vendor status error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to update vendor status',
                    details: error.message
                }
            });
        }
    }

    async deleteVendor(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await adminService.deleteVendor(id);

            res.json({
                success: true,
                message: 'Vendor deleted successfully'
            });
        } catch (error: any) {
            console.error('Delete vendor error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to delete vendor',
                    details: error.message
                }
            });
        }
    }

    // Booking Management
    async getBookings(req: Request, res: Response) {
        try {
            const params = paginationSchema.parse(req.query);
            const result = await adminService.getBookings(params);
            res.json({
                success: true,
                ...result
            });
        } catch (error: any) {
            console.error('Get bookings error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch bookings',
                    details: error.message
                }
            });
        }
    }

    async getBookingById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const booking = await adminService.getBookingById(id);

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    error: {
                        message: 'Booking not found'
                    }
                });
            }

            res.json({
                success: true,
                data: booking
            });
        } catch (error: any) {
            console.error('Get booking error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch booking',
                    details: error.message
                }
            });
        }
    }

    async updateBookingStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = bookingStatusSchema.parse(req.body);
            const booking = await adminService.updateBookingStatus(id, status);

            res.json({
                success: true,
                data: booking,
                message: 'Booking status updated successfully'
            });
        } catch (error: any) {
            console.error('Update booking status error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to update booking status',
                    details: error.message
                }
            });
        }
    }

    // Activity Log
    async getRecentActivity(req: Request, res: Response) {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
            const activities = await adminService.getRecentActivity(limit);

            res.json({
                success: true,
                data: activities
            });
        } catch (error: any) {
            console.error('Get activity error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch activity log',
                    details: error.message
                }
            });
        }
    }

    // Plan Management
    async getPlans(req: Request, res: Response) {
        try {
            const plans = await adminService.getPlans();

            // Convert BigInt to string for JSON serialization
            const plansData = JSON.parse(JSON.stringify(plans, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            res.json({
                success: true,
                data: plansData
            });
        } catch (error: any) {
            console.error('Get plans error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch plans',
                    details: error.message
                }
            });
        }
    }

    async getPlanById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const plan = await adminService.getPlanById(id);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    error: { message: 'Plan not found' }
                });
            }

            const planData = JSON.parse(JSON.stringify(plan, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            res.json({
                success: true,
                data: planData
            });
        } catch (error: any) {
            console.error('Get plan error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to fetch plan',
                    details: error.message
                }
            });
        }
    }

    async createPlan(req: Request, res: Response) {
        try {
            const plan = await adminService.createPlan(req.body);

            const planData = JSON.parse(JSON.stringify(plan, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            res.status(201).json({
                success: true,
                data: planData,
                message: 'Plan created successfully'
            });
        } catch (error: any) {
            console.error('Create plan error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to create plan',
                    details: error.message
                }
            });
        }
    }

    async updatePlan(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const plan = await adminService.updatePlan(id, req.body);

            const planData = JSON.parse(JSON.stringify(plan, (_, value) =>
                typeof value === 'bigint' ? value.toString() : value
            ));

            res.json({
                success: true,
                data: planData,
                message: 'Plan updated successfully'
            });
        } catch (error: any) {
            console.error('Update plan error:', error);
            res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to update plan',
                    details: error.message
                }
            });
        }
    }

    async deletePlan(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await adminService.deletePlan(id);

            res.json({
                success: true,
                message: 'Plan deleted successfully'
            });
        } catch (error: any) {
            console.error('Delete plan error:', error);
            const statusCode = error.message.includes('active subscriptions') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                error: {
                    message: 'Failed to delete plan',
                    details: error.message
                }
            });
        }
    }
}
