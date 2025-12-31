import { Router } from 'express';
import { vendorServiceController } from './vendor-service.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateVendor, requireApprovedVendor } from '../middleware/vendor-auth.middleware.js';
import { VendorServiceCreateSchema, VendorServiceUpdateSchema } from '../vendor.dto.js';

const router = Router();

// Public routes
router.get('/search', vendorServiceController.search.bind(vendorServiceController));
router.get('/category/:categoryId', vendorServiceController.getByCategory.bind(vendorServiceController));
router.get('/:id', vendorServiceController.getById.bind(vendorServiceController));

// Vendor protected routes
router.post(
    '/',
    authenticateVendor,
    requireApprovedVendor,
    validate(VendorServiceCreateSchema),
    vendorServiceController.create.bind(vendorServiceController)
);

router.get(
    '/',
    authenticateVendor,
    vendorServiceController.getMyServices.bind(vendorServiceController)
);

router.put(
    '/:id',
    authenticateVendor,
    requireApprovedVendor,
    validate(VendorServiceUpdateSchema),
    vendorServiceController.update.bind(vendorServiceController)
);

router.delete(
    '/:id',
    authenticateVendor,
    requireApprovedVendor,
    vendorServiceController.delete.bind(vendorServiceController)
);

router.patch(
    '/:id/toggle-availability',
    authenticateVendor,
    requireApprovedVendor,
    vendorServiceController.toggleAvailability.bind(vendorServiceController)
);

export default router;
