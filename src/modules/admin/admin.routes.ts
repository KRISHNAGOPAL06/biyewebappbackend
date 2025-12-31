import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { AdminAuthController } from './admin.auth.controller.js';
import { adminAuthMiddleware } from './admin.middleware.js';

const router = Router();
const adminController = new AdminController();
const adminAuthController = new AdminAuthController();

// Public routes (no auth required)
router.post('/login', adminAuthController.login.bind(adminAuthController));

// Protected routes (require admin auth)
router.use(adminAuthMiddleware);

router.get('/me', adminAuthController.getMe.bind(adminAuthController));

// Dashboard Stats
router.get('/stats', adminController.getStats.bind(adminController));

// User Management
router.get('/users', adminController.getUsers.bind(adminController));
router.get('/users/:id', adminController.getUserById.bind(adminController));
router.put('/users/:id', adminController.updateUser.bind(adminController));
router.delete('/users/:id', adminController.deleteUser.bind(adminController));

// Vendor Management
router.get('/vendors', adminController.getVendors.bind(adminController));
router.get('/vendors/:id', adminController.getVendorById.bind(adminController));
router.put('/vendors/:id/status', adminController.updateVendorStatus.bind(adminController));
router.delete('/vendors/:id', adminController.deleteVendor.bind(adminController));

// Booking Management
router.get('/bookings', adminController.getBookings.bind(adminController));
router.get('/bookings/:id', adminController.getBookingById.bind(adminController));
router.put('/bookings/:id/status', adminController.updateBookingStatus.bind(adminController));

// Plan Management
router.get('/plans', adminController.getPlans.bind(adminController));
router.get('/plans/:id', adminController.getPlanById.bind(adminController));
router.post('/plans', adminController.createPlan.bind(adminController));
router.put('/plans/:id', adminController.updatePlan.bind(adminController));
router.delete('/plans/:id', adminController.deletePlan.bind(adminController));

// Activity Log
router.get('/activity', adminController.getRecentActivity.bind(adminController));

export default router;
