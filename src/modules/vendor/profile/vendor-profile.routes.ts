import { Router } from 'express';
import { vendorProfileController } from './vendor-profile.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateVendor } from '../middleware/vendor-auth.middleware.js';
import { VendorProfileUpdateSchema } from '../vendor.dto.js';
import { z } from 'zod';

const router = Router();

// Basic info update schema
const BasicInfoSchema = z.object({
    businessName: z.string().min(2).max(200).optional(),
    ownerName: z.string().min(2).max(100).optional(),
    phoneNumber: z.string().optional(),
});

// Gallery images schema
const GalleryImagesSchema = z.object({
    images: z.array(z.string().url()).min(1).max(10),
});

const RemoveImageSchema = z.object({
    imageUrl: z.string().url(),
});

// Public routes
router.get('/search', vendorProfileController.searchVendors.bind(vendorProfileController));
router.get('/public/:id', vendorProfileController.getPublicProfile.bind(vendorProfileController));

// Vendor protected routes
router.get(
    '/me',
    authenticateVendor,
    vendorProfileController.getMyProfile.bind(vendorProfileController)
);

router.put(
    '/me',
    authenticateVendor,
    validate(VendorProfileUpdateSchema),
    vendorProfileController.updateProfile.bind(vendorProfileController)
);

router.patch(
    '/me/basic',
    authenticateVendor,
    validate(BasicInfoSchema),
    vendorProfileController.updateBasicInfo.bind(vendorProfileController)
);

router.post(
    '/me/gallery',
    authenticateVendor,
    validate(GalleryImagesSchema),
    vendorProfileController.addGalleryImages.bind(vendorProfileController)
);

router.delete(
    '/me/gallery',
    authenticateVendor,
    validate(RemoveImageSchema),
    vendorProfileController.removeGalleryImage.bind(vendorProfileController)
);

router.get(
    '/me/dashboard',
    authenticateVendor,
    vendorProfileController.getDashboardStats.bind(vendorProfileController)
);

export default router;
