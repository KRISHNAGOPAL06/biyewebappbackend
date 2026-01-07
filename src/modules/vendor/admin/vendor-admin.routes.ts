import { Router } from 'express';
import { vendorAdminController } from './vendor-admin.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateAdmin } from '../middleware/vendor-auth.middleware.js';
import { VendorApprovalSchema } from '../vendor.dto.js';
import { z } from 'zod';

const router = Router();

// Rejection/suspension reason schema
const ReasonSchema = z.object({
    reason: z.string().max(500).optional(),
});

// All routes require admin authentication
router.use(authenticateAdmin);

// Dashboard
router.get('/dashboard', vendorAdminController.getDashboardStats.bind(vendorAdminController));

// Vendor management
router.get('/vendors', vendorAdminController.getVendors.bind(vendorAdminController));
router.get('/vendors/pending', vendorAdminController.getPendingVendors.bind(vendorAdminController));
router.get('/vendors/:id', vendorAdminController.getVendorDetails.bind(vendorAdminController));

// Approval actions
router.post(
    '/vendors/:id/action',
    validate(VendorApprovalSchema),
    vendorAdminController.handleApproval.bind(vendorAdminController)
);

router.put('/vendors/:id/approve', vendorAdminController.approve.bind(vendorAdminController));

router.put(
    '/vendors/:id/reject',
    validate(ReasonSchema),
    vendorAdminController.reject.bind(vendorAdminController)
);

router.put(
    '/vendors/:id/suspend',
    validate(ReasonSchema),
    vendorAdminController.suspend.bind(vendorAdminController)
);

// Delete vendor permanently
router.delete('/vendors/:id', vendorAdminController.deleteVendor.bind(vendorAdminController));

export default router;
