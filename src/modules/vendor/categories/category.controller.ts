import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service.js';
import { sendSuccess } from '../../../utils/response.js';

class CategoryController {
    /**
     * Create new category (Admin only)
     */
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const category = await categoryService.create(req.body);
            return sendSuccess(res, category, 'Category created successfully', 201);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all categories
     */
    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const includeInactive = req.query.includeInactive === 'true';
            const withServiceCount = req.query.withCount === 'true';

            const categories = await categoryService.getAll({
                includeInactive,
                withServiceCount,
            });

            return sendSuccess(res, categories, 'Categories retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get category by ID
     */
    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const category = await categoryService.getById(id);
            return sendSuccess(res, category, 'Category retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get category by slug
     */
    async getBySlug(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const category = await categoryService.getBySlug(slug);
            return sendSuccess(res, category, 'Category retrieved successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Update category (Admin only)
     */
    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const category = await categoryService.update(id, req.body);
            return sendSuccess(res, category, 'Category updated successfully', 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete category (Admin only)
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const result = await categoryService.delete(id);
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Toggle category active status (Admin only)
     */
    async toggleActive(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const category = await categoryService.toggleActive(id);
            return sendSuccess(
                res,
                category,
                `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
                200
            );
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reorder categories (Admin only)
     */
    async reorder(req: Request, res: Response, next: NextFunction) {
        try {
            const { orderedIds } = req.body;
            const result = await categoryService.reorder(orderedIds);
            return sendSuccess(res, result, result.message, 200);
        } catch (error) {
            next(error);
        }
    }
}

export const categoryController = new CategoryController();
