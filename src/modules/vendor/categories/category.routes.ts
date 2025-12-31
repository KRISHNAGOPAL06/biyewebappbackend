import { Router } from 'express';
import { categoryController } from './category.controller.js';
import { validate } from '../../../middleware/validate.js';
import { authenticateAdmin } from '../middleware/vendor-auth.middleware.js';
import { ServiceCategoryCreateSchema, ServiceCategoryUpdateSchema } from '../vendor.dto.js';
import { z } from 'zod';

const router = Router();

// Reorder schema
const ReorderSchema = z.object({
    orderedIds: z.array(z.string().uuid()),
});

// Public routes
router.get('/', categoryController.getAll.bind(categoryController));
router.get('/slug/:slug', categoryController.getBySlug.bind(categoryController));
router.get('/:id', categoryController.getById.bind(categoryController));

// Admin only routes
router.post(
    '/',
    authenticateAdmin,
    validate(ServiceCategoryCreateSchema),
    categoryController.create.bind(categoryController)
);

router.put(
    '/:id',
    authenticateAdmin,
    validate(ServiceCategoryUpdateSchema),
    categoryController.update.bind(categoryController)
);

router.delete(
    '/:id',
    authenticateAdmin,
    categoryController.delete.bind(categoryController)
);

router.patch(
    '/:id/toggle-active',
    authenticateAdmin,
    categoryController.toggleActive.bind(categoryController)
);

router.post(
    '/reorder',
    authenticateAdmin,
    validate(ReorderSchema),
    categoryController.reorder.bind(categoryController)
);

export default router;
