import { EntitlementAction, EntitlementContext, PlanFeatures, MessagingLimits } from './payment.types.js';
import { logger } from '../../utils/logger.js';
import { redis } from '../../config/redis.js';

import { prisma } from '../../prisma.js';

const ICEBREAKER_COUNT_PREFIX = 'icebreaker_count:';
const PARENT_ICEBREAKER_COUNT_PREFIX = 'parent_icebreaker_count:';
const CHAT_COUNT_PREFIX = 'chat_count:';
const BOOST_COUNT_PREFIX = 'boost_count:';
const SPOTLIGHT_COUNT_PREFIX = 'spotlight_count:';
const AI_INTRO_COUNT_PREFIX = 'ai_intro_count:';

export class EntitlementService {
  async can(profileId: string, action: EntitlementAction, context?: EntitlementContext): Promise<boolean> {
    try {
      console.log(`\n[Entitlement] ========== Checking ${action} for profile ${profileId} ==========`);
      logger.info(`[Entitlement] Checking ${action} for profile ${profileId}`);

      const subscription = await this.getActiveSubscription(profileId);

      if (!subscription) {
        console.log(`[Entitlement] ❌ DENIED ${action}: No active subscription found for profile ${profileId}`);
        logger.warn(`[Entitlement] DENIED ${action}: No active subscription found`, { profileId, action });
        return false;
      }

      const features = subscription.plan.features as PlanFeatures;
      console.log(`[Entitlement] ✅ Found subscription:`, {
        profileId,
        planCode: subscription.plan.code,
        planName: subscription.plan.name,
        status: subscription.status,
        messaging: features.messaging,
      });
      logger.info(`[Entitlement] Found subscription`, {
        profileId,
        planCode: subscription.plan.code,
        planName: subscription.plan.name,
        status: subscription.status,
        messaging: features.messaging,
        action
      });

      const result = await this.checkAction(action, profileId, features, context);

      if (!result) {
        console.log(`[Entitlement] ❌ DENIED ${action} - messaging value:`, features.messaging);
        logger.warn(`[Entitlement] DENIED ${action}`, { profileId, planCode: subscription.plan.code, features: JSON.stringify(features) });
      } else {
        console.log(`[Entitlement] ✅ ALLOWED ${action}`);
        logger.info(`[Entitlement] ALLOWED ${action}`, { profileId, planCode: subscription.plan.code });
      }

      return result;
    } catch (error) {
      console.log(`[Entitlement] ❌ ERROR:`, error);
      logger.error('Error checking entitlement', { error, profileId, action });
      return false;
    }
  }

  private async checkAction(
    action: EntitlementAction,
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    switch (action) {
      case 'send_message':
        return this.canSendMessage(profileId, features, context);
      case 'start_chat':
        return this.canStartChat(profileId, features, context);
      case 'upload_photo':
        return this.canUploadPhoto(features, context);
      case 'upload_video':
        return features.video === true;
      case 'view_contact':
        return this.canViewContact(features);
      case 'enable_stealth':
        return features.stealth === true;
      case 'use_boost':
        return this.canUseBoost(profileId, features, context);
      case 'use_spotlight':
        return this.canUseSpotlight(profileId, features, context);
      case 'pause_subscription':
        return features.pauseAllowed === true;
      case 'use_icebreaker':
        return this.canUseIcebreaker(profileId, features, context);
      case 'use_parent_icebreaker':
        return this.canUseParentIcebreaker(profileId, features, context);
      case 'use_filter':
        return this.canUseFilter(features, context);
      case 'access_signature_feed':
        return features.signatureFeed === true;
      case 'use_ai_introduction':
        return this.canUseAiIntroduction(profileId, features, context);
      case 'use_family_messaging':
        return features.familyMessaging === true;
      case 'manual_profile_rewrite':
        return features.founderConsult === true;
      case 'view_obhijaat_profiles':
        return features.signatureFeed === true;
      case 'attend_founder_events':
        return features.founderConsult === true;
      case 'use_video_call':
        return features.videoCalling === true;
      case 'control_visibility':
        return features.visibilityControl === true;
      case 'request_aalok_profile':
        return features.canRequestAalok === true;
      case 'view_tier':
        return this.canViewTier(features, context);
      default:
        logger.warn('Unknown entitlement action', { action, profileId });
        return false;
    }
  }

  async getActiveSubscription(profileId: string) {
    const sub = await prisma.subscription.findFirst({
      where: {
        profileId,
        status: 'active',
        endAt: { gte: new Date() },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!sub) {
      // Fallback: Check for just-expired or future subscriptions if needed? 
      // For now just log
      // console.log(`[Entitlement] No active sub for ${profileId}`);
    }
    return sub;
  }

  async getProfileFeatures(profileId: string): Promise<PlanFeatures | null> {
    const subscription = await this.getActiveSubscription(profileId);
    if (!subscription) return null;
    return subscription.plan.features as PlanFeatures;
  }

  private async canSendMessage(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log(profileId)
    if (features.messaging === false) {
      return false;
    }

    if (features.messaging === 'unlimited' || features.messaging === true) {
      return true;
    }

    const limits = features.messaging as MessagingLimits;
    const messageCount = context?.messageCount ?? 0;

    return messageCount < limits.messagesPerChat;
  }

  private async canStartChat(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log('[canStartChat] Checking messaging feature:', features.messaging);

    // Handle undefined or false - no messaging allowed
    if (features.messaging === undefined || features.messaging === null || features.messaging === false) {
      console.log('[canStartChat] Messaging is disabled (undefined/null/false)');
      return false;
    }

    // Handle unlimited messaging
    if (features.messaging === 'unlimited' || features.messaging === true) {
      console.log('[canStartChat] Unlimited messaging allowed');
      return true;
    }

    // Handle limited messaging (MessagingLimits object)
    if (typeof features.messaging === 'object' && features.messaging !== null) {
      const limits = features.messaging as MessagingLimits;

      // Validate the limits object has required properties
      if (typeof limits.newChatsPerMonth !== 'number') {
        console.log('[canStartChat] ERROR: Invalid limits object, missing newChatsPerMonth');
        return false;
      }

      const monthKey = this.getMonthKey();
      const chatCountKey = `${CHAT_COUNT_PREFIX}${profileId}:${monthKey}`;
      const currentCount = await this.getRedisCount(chatCountKey);

      console.log(`[canStartChat] Limit check: ${currentCount}/${limits.newChatsPerMonth} chats used`);
      return currentCount < limits.newChatsPerMonth;
    }

    // Unknown messaging type - deny by default
    console.log('[canStartChat] Unknown messaging type, denying:', typeof features.messaging);
    return false;
  }

  // private canUploadPhoto(features: PlanFeatures, context?: EntitlementContext): boolean {
  //   const currentPhotoCount = context?.photoCount ?? 0;
  //   return currentPhotoCount < features.photos;
  // }
  private canUploadPhoto(
    features: PlanFeatures,
    context?: EntitlementContext
  ): boolean {
    const currentPhotoCount = context?.photoCount ?? 0;
    const maxPhotos = features.photos ?? 0;

    return currentPhotoCount < maxPhotos;
  }

  private canViewContact(features: PlanFeatures): boolean {
    return features.messaging !== false;
  }

  private async canUseBoost(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log(context)
    const maxBoosts = features.boosts ?? 0;
    if (maxBoosts === 0) return false;

    const monthKey = this.getMonthKey();
    const boostKey = `${BOOST_COUNT_PREFIX}${profileId}:${monthKey}`;
    const currentCount = await this.getRedisCount(boostKey);

    return currentCount < Number(maxBoosts);
  }

  private async canUseSpotlight(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log(context)
    const maxSpotlight = features.spotlight ?? 0;
    if (maxSpotlight === 0) return false;

    const monthKey = this.getMonthKey();
    const spotlightKey = `${SPOTLIGHT_COUNT_PREFIX}${profileId}:${monthKey}`;
    const currentCount = await this.getRedisCount(spotlightKey);

    return currentCount < Number(maxSpotlight);
  }

  private async canUseIcebreaker(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log(context)
    const maxIcebreakers = features.icebreakersPerMonth ?? 0;
    if (maxIcebreakers === 0) return false;

    const monthKey = this.getMonthKey();
    const icebreakerKey = `${ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`;
    const currentCount = await this.getRedisCount(icebreakerKey);

    return currentCount < Number(maxIcebreakers);
  }

  private async canUseParentIcebreaker(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log(context)
    const maxParentIcebreakers = features.parentIcebreakers ?? 0;
    if (maxParentIcebreakers === 0) return false;

    const monthKey = this.getMonthKey();
    const parentIcebreakerKey = `${PARENT_ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`;
    const currentCount = await this.getRedisCount(parentIcebreakerKey);

    return currentCount < Number(maxParentIcebreakers);
  }

  private canUseFilter(features: PlanFeatures, context?: EntitlementContext): boolean {
    const allowedFilters = features.filters ?? [];
    const filterName = context?.filterName;

    if (!filterName) return true;
    return allowedFilters.includes(filterName);
  }

  /**
   * Check if user can view profiles of a specific tier
   * @param features - The user's plan features
   * @param context - Contains targetTier (the tier of the profile being viewed)
   */
  private canViewTier(features: PlanFeatures, context?: EntitlementContext): boolean {
    const allowedTiers = features.tierVisibility ?? [];
    const targetTier = context?.targetTier;

    // If no target tier specified, allow by default
    if (!targetTier) return true;

    // Check if the target tier is in the allowed visibility list
    return allowedTiers.includes(targetTier);
  }

  private async canUseAiIntroduction(
    profileId: string,
    features: PlanFeatures,
    context?: EntitlementContext
  ): Promise<boolean> {
    console.log(context)
    const maxAiIntros = features.aiIntroductions ?? 0;
    if (maxAiIntros === 0) return false;

    const monthKey = this.getMonthKey();
    const aiIntroKey = `${AI_INTRO_COUNT_PREFIX}${profileId}:${monthKey}`;
    const currentCount = await this.getRedisCount(aiIntroKey);

    return currentCount < Number(maxAiIntros);
  }

  async incrementUsage(profileId: string, action: EntitlementAction): Promise<void> {
    const monthKey = this.getMonthKey();
    let key: string | null = null;

    switch (action) {
      case 'start_chat':
        key = `${CHAT_COUNT_PREFIX}${profileId}:${monthKey}`;
        break;
      case 'use_boost':
        key = `${BOOST_COUNT_PREFIX}${profileId}:${monthKey}`;
        break;
      case 'use_spotlight':
        key = `${SPOTLIGHT_COUNT_PREFIX}${profileId}:${monthKey}`;
        break;
      case 'use_icebreaker':
        key = `${ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`;
        break;
      case 'use_parent_icebreaker':
        key = `${PARENT_ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`;
        break;
      case 'use_ai_introduction':
        key = `${AI_INTRO_COUNT_PREFIX}${profileId}:${monthKey}`;
        break;
    }

    if (key) {
      try {
        await redis.incr(key);
        await redis.expire(key, 35 * 24 * 60 * 60);
      } catch (error) {
        logger.error(`[Entitlement] Redis increment failed for ${key}:`, error);
        // Do not crash execution if Redis fails
      }
    }
  }

  async getUsageStats(profileId: string): Promise<Record<string, number>> {
    const monthKey = this.getMonthKey();

    const [chatCount, boostCount, spotlightCount, icebreakerCount, parentIcebreakerCount, aiIntroCount] =
      await Promise.all([
        this.getRedisCount(`${CHAT_COUNT_PREFIX}${profileId}:${monthKey}`),
        this.getRedisCount(`${BOOST_COUNT_PREFIX}${profileId}:${monthKey}`),
        this.getRedisCount(`${SPOTLIGHT_COUNT_PREFIX}${profileId}:${monthKey}`),
        this.getRedisCount(`${ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`),
        this.getRedisCount(`${PARENT_ICEBREAKER_COUNT_PREFIX}${profileId}:${monthKey}`),
        this.getRedisCount(`${AI_INTRO_COUNT_PREFIX}${profileId}:${monthKey}`),
      ]);

    return {
      chatsStarted: chatCount,
      boostsUsed: boostCount,
      spotlightsUsed: spotlightCount,
      icebreakersUsed: icebreakerCount,
      parentIcebreakersUsed: parentIcebreakerCount,
      aiIntroductionsUsed: aiIntroCount,
    };
  }

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private async getRedisCount(key: string): Promise<number> {
    try {
      const value = await redis.get(key);
      return value ? parseInt(value, 10) : 0;
    } catch (error) {
      logger.error(`[Entitlement] Redis get failed for ${key}:`, error);
      return 0;
    }
  }

  // async handleDowngrade(profileId: string, newPlanFeatures: PlanFeatures): Promise<void> {
  //   const photos = await prisma.photo.findMany({
  //     where: { profileId, deletedAt: null },
  //     orderBy: { createdAt: 'asc' },
  //   });

  //   if (photos.length > newPlanFeatures.photos) {
  //     const photosToHide = photos.slice(newPlanFeatures.photos);
  //     for (const photo of photosToHide) {
  //       await prisma.photo.update({
  //         where: { id: photo.id },
  //         data: { privacyLevel: 'hidden' },
  //       });
  //     }
  //     logger.info('Photos hidden due to downgrade', {
  //       profileId,
  //       hiddenCount: photosToHide.length,
  //     });
  //   }
  // }
  async handleDowngrade(
    profileId: string,
    newPlanFeatures: PlanFeatures
  ): Promise<void> {
    const photos = await prisma.photo.findMany({
      where: { profileId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });

    const maxPhotos = newPlanFeatures.photos ?? 0;

    if (photos.length > maxPhotos) {
      const photosToHide = photos.slice(maxPhotos);

      for (const photo of photosToHide) {
        await prisma.photo.update({
          where: { id: photo.id },
          data: { privacyLevel: 'hidden' },
        });
      }

      logger.info('Photos hidden due to downgrade', {
        profileId,
        hiddenCount: photosToHide.length,
      });
    }
  }

}

export const entitlementService = new EntitlementService();
