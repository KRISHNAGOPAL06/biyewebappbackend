import { SubscriptionStatus, SubscriptionResponse, PlanFeatures } from './payment.types.js';
import { planService } from './plan.service.js';
import { entitlementService } from './entitlement.service.js';
import { eventBus } from '../../events/eventBus.js';
import { emitSubscriptionUpdate } from './subscription.gateway.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../prisma.js';

export class SubscriptionService {
  async createSubscription(
    profileId: string,
    planId: string,
    createdByUserId: string
  ): Promise<SubscriptionResponse> {
    const plan = await planService.getPlanById(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    await this.expireActiveSubscriptions(profileId);

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscription.create({
      data: {
        profileId,
        planId,
        status: 'active',
        startAt,
        endAt,
        createdByUser: createdByUserId,
      },
      include: { plan: true },
    });

    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      profileId,
      planCode: plan.code,
    });

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (profile) {
      eventBus.emitNotification({
        userId: profile.userId,
        type: 'subscription_activated',
        metadata: {
          subscriptionId: subscription.id,
          planCode: plan.code,
          planName: plan.name,
          endAt: endAt.toISOString(),
        },
        priority: 'HIGH',
      });

      // Emit real-time WebSocket event
      emitSubscriptionUpdate(profile.userId, profileId, 'created', {
        id: subscription.id,
        planCode: plan.code,
        planName: plan.name,
        status: 'active',
        startDate: startAt,
        endDate: endAt,
        features: plan.features as Record<string, any>,
      });
    }

    return this.formatSubscriptionResponse(subscription);
  }

  async getActiveSubscription(profileId: string): Promise<SubscriptionResponse | null> {
    const subscription = await prisma.subscription.findFirst({
      where: {
        profileId,
        status: 'active',
        endAt: { gte: new Date() },
      },
      include: { plan: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    console.log('[SubscriptionService] getActiveSubscription result for', profileId, ':', subscription ? { id: subscription.id, planCode: subscription.plan?.code, status: subscription.status } : 'null');

    if (!subscription) return null;
    return this.formatSubscriptionResponse(subscription);
  }

  async getSubscriptionHistory(profileId: string): Promise<SubscriptionResponse[]> {
    const subscriptions = await prisma.subscription.findMany({
      where: { profileId },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    return subscriptions.map((s) => this.formatSubscriptionResponse(s));
  }

  async pauseSubscription(profileId: string, pauseDays: number, requestingUserId: string): Promise<SubscriptionResponse> {
    await this.validateNotGuardian(profileId, requestingUserId);

    const subscription = await prisma.subscription.findFirst({
      where: {
        profileId,
        status: 'active',
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const features = subscription.plan.features as PlanFeatures;
    if (!features.pauseAllowed) {
      throw new Error('Your plan does not allow pausing');
    }

    const now = new Date();
    const pausedUntil = new Date(now.getTime() + pauseDays * 24 * 60 * 60 * 1000);
    const remainingDays = Math.ceil((subscription.endAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const newEndAt = new Date(pausedUntil.getTime() + remainingDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'paused',
        pausedUntil,
        endAt: newEndAt,
      },
      include: { plan: true },
    });

    logger.info('Subscription paused', {
      subscriptionId: subscription.id,
      profileId,
      pausedUntil,
      remainingDays,
    });

    return this.formatSubscriptionResponse(updated);
  }

  private async validateNotGuardian(profileId: string, userId: string): Promise<void> {
    const candidateLink = await prisma.candidateLink.findFirst({
      where: {
        profileId,
        parentUserId: userId,
        role: 'guardian',
        status: 'active',
      },
    });

    if (candidateLink) {
      throw new Error('Guardians cannot perform this action. Only the parent or candidate can.');
    }
  }

  async resumeSubscription(profileId: string, requestingUserId: string): Promise<SubscriptionResponse> {
    await this.validateNotGuardian(profileId, requestingUserId);

    const subscription = await prisma.subscription.findFirst({
      where: {
        profileId,
        status: 'paused',
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('No paused subscription found');
    }

    const now = new Date();
    const pausedAt = subscription.pausedUntil ? new Date(subscription.pausedUntil.getTime() - 30 * 24 * 60 * 60 * 1000) : now;
    const pausedDuration = now.getTime() - pausedAt.getTime();
    const newEndAt = new Date(subscription.endAt.getTime() - pausedDuration + (now.getTime() - (subscription.pausedUntil?.getTime() || now.getTime())));
    console.log(newEndAt)

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'active',
        pausedUntil: null,
      },
      include: { plan: true },
    });

    logger.info('Subscription resumed', {
      subscriptionId: subscription.id,
      profileId,
    });

    // Get profile for WebSocket event
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (profile) {
      emitSubscriptionUpdate(profile.userId, profileId, 'resumed', {
        id: updated.id,
        planCode: updated.plan.code,
        planName: updated.plan.name,
        status: 'active',
        startDate: updated.startAt,
        endDate: updated.endAt,
        features: updated.plan.features as Record<string, any>,
      });
    }

    return this.formatSubscriptionResponse(updated);
  }

  async cancelSubscription(profileId: string, cancelledByUserId: string): Promise<SubscriptionResponse> {
    await this.validateNotGuardian(profileId, cancelledByUserId);

    const subscription = await prisma.subscription.findFirst({
      where: {
        profileId,
        status: { in: ['active', 'paused'] },
      },
      include: { plan: true },
    });

    if (!subscription) {
      throw new Error('No active or paused subscription found');
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled' },
      include: { plan: true },
    });

    logger.info('Subscription cancelled', {
      subscriptionId: subscription.id,
      profileId,
      cancelledBy: cancelledByUserId,
    });

    // Get profile for WebSocket event
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (profile) {
      emitSubscriptionUpdate(profile.userId, profileId, 'cancelled', {
        id: updated.id,
        planCode: updated.plan.code,
        planName: updated.plan.name,
        status: 'cancelled',
        startDate: updated.startAt,
        endDate: updated.endAt,
        features: updated.plan.features as Record<string, any>,
      });
    }

    return this.formatSubscriptionResponse(updated);
  }

  async expireActiveSubscriptions(profileId: string): Promise<void> {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: {
        profileId,
        status: 'active',
      },
      include: { plan: true },
    });

    for (const sub of activeSubscriptions) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'expired' },
      });

      logger.info('Subscription expired (replaced by new)', {
        subscriptionId: sub.id,
        profileId,
      });
    }
  }

  async processExpiredSubscriptions(): Promise<void> {
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endAt: { lt: new Date() },
      },
      include: {
        plan: true,
        profile: { select: { userId: true } },
      },
    });

    for (const subscription of expiredSubscriptions) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'expired' },
      });

      eventBus.emitNotification({
        userId: subscription.profile.userId,
        type: 'subscription_expired',
        metadata: {
          subscriptionId: subscription.id,
          planCode: subscription.plan.code,
          planName: subscription.plan.name,
        },
        priority: 'HIGH',
      });

      // Emit real-time WebSocket event
      emitSubscriptionUpdate(subscription.profile.userId, subscription.profileId, 'expired', {
        id: subscription.id,
        planCode: subscription.plan.code,
        planName: subscription.plan.name,
        status: 'expired',
        startDate: subscription.startAt,
        endDate: subscription.endAt,
        features: subscription.plan.features as Record<string, any>,
      });

      logger.info('Subscription expired', {
        subscriptionId: subscription.id,
        profileId: subscription.profileId,
      });
    }
  }

  async upgradeSubscription(
    profileId: string,
    newPlanId: string,
    createdByUserId: string
  ): Promise<SubscriptionResponse> {
    await this.validateNotGuardian(profileId, createdByUserId);

    const currentSub = await this.getActiveSubscription(profileId);
    const newPlan = await planService.getPlanById(newPlanId);

    if (!newPlan) {
      throw new Error('Plan not found');
    }

    const subscription = await this.createSubscription(profileId, newPlanId, createdByUserId);

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (profile) {
      eventBus.emitNotification({
        userId: profile.userId,
        type: 'subscription_upgraded',
        metadata: {
          subscriptionId: subscription.id,
          oldPlanCode: currentSub?.plan.code,
          newPlanCode: newPlan.code,
          newPlanName: newPlan.name,
        },
        priority: 'HIGH',
      });
    }

    return subscription;
  }

  async downgradeSubscription(
    profileId: string,
    newPlanId: string,
    createdByUserId: string
  ): Promise<SubscriptionResponse> {
    await this.validateNotGuardian(profileId, createdByUserId);

    const newPlan = await planService.getPlanById(newPlanId);

    if (!newPlan) {
      throw new Error('Plan not found');
    }

    await entitlementService.handleDowngrade(profileId, newPlan.features);

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      select: { userId: true },
    });

    if (profile) {
      eventBus.emitNotification({
        userId: profile.userId,
        type: 'subscription_downgraded',
        metadata: {
          newPlanCode: newPlan.code,
          newPlanName: newPlan.name,
        },
        priority: 'HIGH',
      });
    }

    return this.createSubscription(profileId, newPlanId, createdByUserId);
  }

  private formatSubscriptionResponse(subscription: any): SubscriptionResponse {
    return {
      id: subscription.id,
      profileId: subscription.profileId,
      plan: {
        id: subscription.plan.id,
        code: subscription.plan.code,
        name: subscription.plan.name,
        price: subscription.plan.price,
        durationDays: subscription.plan.durationDays,
        isInviteOnly: subscription.plan.isInviteOnly,
        features: subscription.plan.features as PlanFeatures,
      },
      status: subscription.status as SubscriptionStatus,
      startAt: subscription.startAt,
      endAt: subscription.endAt,
      pausedUntil: subscription.pausedUntil,
      createdAt: subscription.createdAt,
    };
  }
}

export const subscriptionService = new SubscriptionService();
