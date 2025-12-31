import { PrismaClient } from '@prisma/client';
import { ServiceCategoryCreateDTO, ServiceCategoryUpdateDTO } from '../vendor.dto.js';
import { AppError } from '../../../utils/AppError.js';

const prisma = new PrismaClient();

class CategoryService {
    /**
     * Generate slug from name
     */
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    /**
     * Create a new service category (Admin only)
     */
    async create(dto: ServiceCategoryCreateDTO) {
        // Check if category with same name exists
        const existing = await prisma.serviceCategory.findUnique({
            where: { name: dto.name },
        });

        if (existing) {
            throw new AppError('A category with this name already exists', 400, 'CATEGORY_EXISTS');
        }

        // Generate unique slug
        let slug = this.generateSlug(dto.name);
        const existingSlug = await prisma.serviceCategory.findUnique({
            where: { slug },
        });

        if (existingSlug) {
            slug = `${slug}-${Date.now()}`;
        }

        const category = await prisma.serviceCategory.create({
            data: {
                ...dto,
                slug,
            },
        });

        return category;
    }

    /**
     * Get all categories (with optional filters)
     */
    async getAll(options?: { includeInactive?: boolean; withServiceCount?: boolean }) {
        const where = options?.includeInactive ? {} : { isActive: true };

        const categories = await prisma.serviceCategory.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: options?.withServiceCount
                ? {
                    _count: {
                        select: { services: true },
                    },
                }
                : undefined,
        });

        return categories;
    }

    /**
     * Get category by ID
     */
    async getById(id: string) {
        const category = await prisma.serviceCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { services: true },
                },
            },
        });

        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        return category;
    }

    /**
     * Get category by slug
     */
    async getBySlug(slug: string) {
        const category = await prisma.serviceCategory.findUnique({
            where: { slug },
            include: {
                _count: {
                    select: { services: true },
                },
            },
        });

        if (!category) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        return category;
    }

    /**
     * Update category (Admin only)
     */
    async update(id: string, dto: ServiceCategoryUpdateDTO) {
        const existing = await prisma.serviceCategory.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        // If name is being changed, check for duplicates
        if (dto.name && dto.name !== existing.name) {
            const duplicate = await prisma.serviceCategory.findUnique({
                where: { name: dto.name },
            });

            if (duplicate) {
                throw new AppError('A category with this name already exists', 400, 'CATEGORY_EXISTS');
            }
        }

        // Update slug if name changes
        const updateData: any = { ...dto };
        if (dto.name && dto.name !== existing.name) {
            let newSlug = this.generateSlug(dto.name);
            const existingSlug = await prisma.serviceCategory.findFirst({
                where: {
                    slug: newSlug,
                    id: { not: id },
                },
            });

            if (existingSlug) {
                newSlug = `${newSlug}-${Date.now()}`;
            }
            updateData.slug = newSlug;
        }

        const category = await prisma.serviceCategory.update({
            where: { id },
            data: updateData,
        });

        return category;
    }

    /**
     * Delete category (Admin only)
     */
    async delete(id: string) {
        const existing = await prisma.serviceCategory.findUnique({
            where: { id },
            include: {
                _count: {
                    select: { services: true },
                },
            },
        });

        if (!existing) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        if (existing._count.services > 0) {
            throw new AppError(
                `Cannot delete category. ${existing._count.services} services are using this category.`,
                400,
                'CATEGORY_IN_USE'
            );
        }

        await prisma.serviceCategory.delete({
            where: { id },
        });

        return { message: 'Category deleted successfully' };
    }

    /**
     * Toggle category active status (Admin only)
     */
    async toggleActive(id: string) {
        const existing = await prisma.serviceCategory.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new AppError('Category not found', 404, 'CATEGORY_NOT_FOUND');
        }

        const category = await prisma.serviceCategory.update({
            where: { id },
            data: { isActive: !existing.isActive },
        });

        return category;
    }

    /**
     * Reorder categories (Admin only)
     */
    async reorder(orderedIds: string[]) {
        const updates = orderedIds.map((id, index) =>
            prisma.serviceCategory.update({
                where: { id },
                data: { sortOrder: index },
            })
        );

        await prisma.$transaction(updates);

        return { message: 'Categories reordered successfully' };
    }
}

export const categoryService = new CategoryService();
