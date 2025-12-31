import { Router } from 'express';
import { reviewController } from './review.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateToken } from '../../../middleware/authMiddleware.js';
import { authenticateVendor, authenticateAdmin } from '../middleware/vendor-auth.middleware.js';
import { ReviewCreateSchema, ReviewReplySchema } from '../vendor.dto.js';

const router = Router();

// Vendor routes (must come before /:id to avoid matching "my" as an ID)
router.get(
    '/my',
    authenticateVendor,
    reviewController.getMyReviews.bind(reviewController)
);

router.put(
    '/:id/reply',
    authenticateVendor,
    validate(ReviewReplySchema),
    reviewController.reply.bind(reviewController)
);

// User routes
router.post(
    '/',
    authenticateToken,
    validate(ReviewCreateSchema),
    reviewController.create.bind(reviewController)
);

// Public routes (/:id must come after specific routes)
router.get('/service/:serviceId', reviewController.getServiceReviews.bind(reviewController));
router.get('/vendor/:vendorId', reviewController.getVendorReviews.bind(reviewController));
router.get('/:id', reviewController.getById.bind(reviewController));

// Admin routes
router.patch(
    '/:id/visibility',
    authenticateAdmin,
    reviewController.toggleVisibility.bind(reviewController)
);

export default router;
