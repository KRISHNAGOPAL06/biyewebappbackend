import { PlanResponse, PlanFeatures } from './payment.types.js';
import { logger } from '../../utils/logger.js';

import { prisma } from '../../prisma.js';

export class PlanService {
  async getAllPlans(
    includeInvite: boolean = false,
    category?: string
  ): Promise<PlanResponse[]> {
    const where: any = {};

    if (!includeInvite) {
      where.isInviteOnly = false;
    }

    if (category) {
      where.category = category;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: { price: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      isInviteOnly: plan.isInviteOnly,
      category: plan.category,
      features: plan.features as PlanFeatures,
      // Discount & coupon fields for frontend pricing
      discountPercent: plan.discountPercent,
      discountAmount: plan.discountAmount,
      couponCode: plan.couponCode,
      couponValidUntil: plan.couponValidUntil,
    }));
  }

  async getPlanByCode(code: string): Promise<PlanResponse | null> {
    const plan = await prisma.plan.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!plan) {
      return null;
    }

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      isInviteOnly: plan.isInviteOnly,
      features: plan.features as PlanFeatures,
      // Include discount fields for checkout
      discountPercent: plan.discountPercent,
      discountAmount: plan.discountAmount,
    };
  }

  async getPlanById(id: string): Promise<PlanResponse | null> {
    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return null;
    }

    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      price: plan.price,
      durationDays: plan.durationDays,
      isInviteOnly: plan.isInviteOnly,
      features: plan.features as PlanFeatures,
    };
  }

  async validatePlanAccess(planCode: string, hasInvite: boolean = false): Promise<{ valid: boolean; error?: string }> {
    const plan = await this.getPlanByCode(planCode);

    if (!plan) {
      return { valid: false, error: 'Plan not found' };
    }

    if (plan.isInviteOnly && !hasInvite) {
      logger.warn('Attempted to access invite-only plan without invite', { planCode });
      return { valid: false, error: 'This plan requires an invitation' };
    }

    return { valid: true };
  }

  async validateCoupon(couponCode: string): Promise<{
    valid: boolean;
    error?: string;
    discountAmount?: number;
    discountPercent?: number;
    planCode?: string;
  }> {
    if (!couponCode || couponCode.trim() === '') {
      return { valid: false, error: 'Coupon code is required' };
    }

    const normalizedCode = couponCode.trim().toUpperCase();

    // Find plan with this coupon code
    const plan = await prisma.plan.findFirst({
      where: {
        couponCode: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
      },
    });

    if (!plan) {
      logger.warn('Invalid coupon code attempted', { couponCode: normalizedCode });
      return { valid: false, error: 'Invalid coupon code' };
    }

    // Check if coupon has expired
    if (plan.couponValidUntil && new Date() > plan.couponValidUntil) {
      return { valid: false, error: 'Coupon code has expired' };
    }

    return {
      valid: true,
      discountAmount: plan.discountAmount || 0,
      discountPercent: plan.discountPercent || 0,
      planCode: plan.code,
    };
  }
}

export const planService = new PlanService();
