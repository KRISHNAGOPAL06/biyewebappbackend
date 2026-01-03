import { Profile } from '@prisma/client';
// import { rankingService } from './ranking.service.js';
import { logger } from '../../utils/logger.js';
import { entitlementService } from '../payments/entitlement.service.js';


// import { profile } from 'console';

import { prisma } from '../../prisma.js';
// function decimalToNumber(value: Prisma.Decimal | null | undefined): number | undefined {
//   return value ? value.toNumber() : undefined;
// }
// console.log(decimalToNumber)

export class RecommendationService {
  // async getRecommendations(
  //   userId: string,
  //   cursor: { id: string; createdAt: Date } | null,
  //   limit: number
  // ) {
  //   const effectiveUserId = await this.resolveCandidateUserId(userId);

  //   console.log(userId);
  //   console.log(effectiveUserId);

  //   const userProfile = await prisma.profile.findFirst({
  //     where: { userId: effectiveUserId },
  //     include: { preferences: true },
  //   });
  //   console.log(userProfile);


  //   const baseQuery: any = {
  //     published: true,
  //     deletedAt: null,
  //     userId: { not: effectiveUserId },
  //   };

  //   if (cursor) {
  //     baseQuery.OR = [
  //       {
  //         createdAt: { lt: cursor.createdAt },
  //       },
  //       {
  //         createdAt: cursor.createdAt,
  //         id: { lt: cursor.id },
  //       },
  //     ];
  //   }

  //   const profiles = await prisma.profile.findMany({
  //     where: baseQuery,
  //     take: limit + 1,
  //     orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  //     include: {
  //       photos: {
  //         where: {
  //           moderationStatus: 'approved',
  //           deletedAt: null,
  //         },
  //       },
  //     },
  //   });
  //   console.log(profiles)

  //   const rankedProfiles = rankingService.rankProfiles(
  //     profiles,
  //     userProfile?.preferences
  //   );
  //   console.log(rankedProfiles)
  //   console.log("profiles hello")



  //   logger.info('Recommendations generated', {
  //     userId,
  //     effectiveUserId,
  //     count: rankedProfiles.length,
  //     hasCursor: !!cursor,
  //   });

  //   return rankedProfiles;
  // }
  async getRecommendations(
    userId: string,
    cursor: { id: string; createdAt: Date } | null,
    limit: number
  ) {
    const effectiveUserId = await this.resolveCandidateUserId(userId);

    // Fetch user + profile
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { lookingFor: true }
    });
    console.log(user);


    const userProfile = await prisma.profile.findUnique({
      where: { userId: effectiveUserId },
      include: { preferences: true },
    });
    console.log(userProfile);


    if (!userProfile) throw new Error("Profile missing");

    // 1️⃣ Determine required gender
    const requiredGender =
      user?.lookingFor === "bride" ? "female" :
        user?.lookingFor === "groom" ? "male" :
          undefined;


    // -------------------------------
    // 2️⃣ Build Base Query
    // -------------------------------
    const baseQuery: any = {
      published: true,
      deletedAt: null,
      userId: { not: effectiveUserId },
    };

    // Use case-insensitive gender matching
    if (requiredGender) baseQuery.gender = { equals: requiredGender, mode: 'insensitive' };

    // -------------------------------
    // 3️⃣ Apply partner preference filters
    // -------------------------------
    const prefs = userProfile;

    // Age
    if (prefs.prefAgeRangeFrom || prefs.prefAgeRangeTo) {
      const now = new Date();
      baseQuery.dob = {};
      if (prefs.prefAgeRangeFrom)
        baseQuery.dob.lte = new Date(now.setFullYear(now.getFullYear() - prefs.prefAgeRangeFrom));
      if (prefs.prefAgeRangeTo)
        baseQuery.dob.gte = new Date(now.setFullYear(now.getFullYear() - prefs.prefAgeRangeTo));
    }

    // // Height
    if (prefs.prefHeightFrom || prefs.prefHeightTo) {
      baseQuery.height = {};
      if (prefs.prefHeightFrom) baseQuery.height.gte = prefs.prefHeightFrom;
      if (prefs.prefHeightTo) baseQuery.height.lte = prefs.prefHeightTo;
    }

    // if (prefs.prefReligion) baseQuery.religion = prefs.prefReligion;
    // if (prefs.prefMaritalStatus) baseQuery.maritalStatus = prefs.prefMaritalStatus;
    // if (prefs.prefProfession) baseQuery.profession = prefs.prefProfession;
    // if (prefs.prefEducation) baseQuery.highestEducation = prefs.prefEducation;
    if (prefs.prefReligion) {
      baseQuery.religion = { equals: prefs.prefReligion, mode: "insensitive" };
    }
    if (prefs.prefMaritalStatus) {
      baseQuery.maritalStatus = { equals: prefs.prefMaritalStatus, mode: "insensitive" };
    }
    // if (prefs.prefProfession) {
    //   baseQuery.profession = { equals: prefs.prefProfession, mode: "insensitive" };
    // }
    // if (prefs.prefEducation) {
    //   baseQuery.highestEducation = { equals: prefs.prefEducation, mode: "insensitive" };
    // }


    // ----------------------------------------
    // 4️⃣ Location Radius Preference Handling
    // ----------------------------------------
    // const RADIUS_KM = 50; // Adjust based on preference

    // if (prefs.prefLocation?.lat && prefs.prefLocation?.lng) {
    //   const { lat, lng } = prefs.prefLocation;

    //   baseQuery.AND = [
    //     prisma.$queryRawUnsafe(`
    //       ST_DistanceSphere(
    //         point(location->>'lng', location->>'lat'),
    //         point(${lng}, ${lat})
    //       ) <= ${RADIUS_KM * 1000}
    //     `)
    //   ];
    // }

    // ----------------------------------------
    // Pagination Cursor
    // ----------------------------------------
    if (cursor) {
      baseQuery.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    }
    console.log(baseQuery)

    // ----------------------------------------
    // 5️⃣ Fetch Candidate Profiles
    // ----------------------------------------
    const profiles = await prisma.profile.findMany({
      where: baseQuery,
      take: limit + 1,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      include: {
        photos: {
          where: { moderationStatus: "approved", deletedAt: null },
        },
      },
    });
    console.log(profiles);

    // ----------------------------------------
    // 5.5 Tier Visibility Filtering
    // ----------------------------------------
    // Get the requester's plan features for tier visibility
    const requesterFeatures = await entitlementService.getProfileFeatures(userProfile.id);
    const allowedTiers = requesterFeatures?.tierVisibility ?? ['ALAAP', 'JATRA', 'AALOK', 'OBHIJAAT'];

    // Filter profiles based on tier visibility
    // We need to get each profile's subscription tier
    const profilesWithTiers = await Promise.all(
      profiles.map(async (profile) => {
        const profileSubscription = await prisma.subscription.findFirst({
          where: {
            profileId: profile.id,
            status: 'active',
            endAt: { gte: new Date() },
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        });
        return {
          ...profile,
          planCode: profileSubscription?.plan?.code || 'ALAAP', // Default to ALAAP if no subscription
        };
      })
    );

    // Filter to only show profiles whose tier the requester is allowed to view
    const visibleProfiles = profilesWithTiers.filter((profile) => {
      return allowedTiers.includes(profile.planCode);
    });

    logger.debug('Tier visibility filtering', {
      requesterId: userProfile.id,
      allowedTiers,
      totalProfiles: profiles.length,
      visibleProfiles: visibleProfiles.length,
    });

    // ----------------------------------------
    // 6️⃣ Ranking: Weighted + ML Score
    // ----------------------------------------
    const ranked = await this.applyAdvancedRanking(userProfile, visibleProfiles);
    console.log(ranked);

    const enrichedRecommendations = await this.attachInterestStatus(
      effectiveUserId,
      ranked
    );

    console.log(enrichedRecommendations);

    return enrichedRecommendations;
  }


  async getNewProfiles(
    userId: string,
    cursor: { id: string; createdAt: Date } | null,
    limit: number
  ) {
    const effectiveUserId = await this.resolveCandidateUserId(userId);

    // Fetch user + profile
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { lookingFor: true }
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const baseQuery: any = {
      published: true,
      deletedAt: null,
      userId: { not: effectiveUserId },
      // createdAt: { gte: startOfToday },
    };
    const requiredGender =
      user?.lookingFor === "bride" ? "female" :
        user?.lookingFor === "groom" ? "male" :
          undefined;


    if (requiredGender) baseQuery.gender = { equals: requiredGender, mode: 'insensitive' };

    if (cursor) {
      baseQuery.OR = [
        {
          createdAt: { lt: cursor.createdAt },
        },
        {
          createdAt: cursor.createdAt,
          id: { lt: cursor.id },
        },
      ];
    }
    console.log(baseQuery)

    const profiles = await prisma.profile.findMany({
      where: baseQuery,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        photos: {
          where: {
            moderationStatus: 'approved',
            deletedAt: null,
          },
        },
      },
    });
    console.log(profiles)

    // ----------------------------------------
    // Tier Visibility Filtering
    // ----------------------------------------
    const userProfile = await prisma.profile.findUnique({
      where: { userId: effectiveUserId },
    });

    if (!userProfile) {
      return [];
    }

    const requesterFeatures = await entitlementService.getProfileFeatures(userProfile.id);
    const allowedTiers = requesterFeatures?.tierVisibility ?? ['ALAAP', 'JATRA', 'AALOK', 'OBHIJAAT'];

    const profilesWithTiers = await Promise.all(
      profiles.map(async (profile) => {
        const profileSubscription = await prisma.subscription.findFirst({
          where: {
            profileId: profile.id,
            status: 'active',
            endAt: { gte: new Date() },
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        });
        return {
          ...profile,
          planCode: profileSubscription?.plan?.code || 'ALAAP',
        };
      })
    );

    const visibleProfiles = profilesWithTiers.filter((profile) => {
      return allowedTiers.includes(profile.planCode);
    });

    logger.info('New profiles fetched', {
      userId,
      effectiveUserId,
      count: visibleProfiles.length,
      date: startOfToday.toISOString(),
    });

    const enrichedProfiles = await this.attachInterestStatus(
      effectiveUserId,
      visibleProfiles
    );

    console.log(enrichedProfiles)

    return enrichedProfiles;
  }

  async getNearbyProfiles(
    userId: string,
    cursor: { id: string; createdAt: Date } | null,
    limit: number
  ) {
    const effectiveUserId = await this.resolveCandidateUserId(userId);

    const userProfile = await prisma.profile.findFirst({
      where: { userId: effectiveUserId },
    });

    if (!userProfile || !userProfile.location) {
      logger.warn('User profile or location not found for nearby search', { userId, effectiveUserId });
      return [];
    }

    const userCity = (userProfile.location as any)?.city;

    if (!userCity) {
      return [];
    }

    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { lookingFor: true }
    });

    const baseQuery: any = {
      published: true,
      deletedAt: null,
      userId: { not: effectiveUserId },
    };

    if (cursor) {
      baseQuery.OR = [
        {
          createdAt: { lt: cursor.createdAt },
        },
        {
          createdAt: cursor.createdAt,
          id: { lt: cursor.id },
        },
      ];
    }

    const requiredGender =
      user?.lookingFor === "bride" ? "female" :
        user?.lookingFor === "groom" ? "male" :
          undefined;

    if (requiredGender) baseQuery.gender = { equals: requiredGender, mode: 'insensitive' };

    const profiles = await prisma.profile.findMany({
      where: baseQuery,
      take: limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        photos: {
          where: {
            moderationStatus: 'approved',
            deletedAt: null,
          },
        },
      },
    });

    const nearbyProfiles = profiles.filter((profile: any) => {
      const profileCity = (profile.location as any)?.city;
      return profileCity === userCity;
    });

    // ----------------------------------------
    // Tier Visibility Filtering
    // ----------------------------------------
    const requesterFeatures = await entitlementService.getProfileFeatures(userProfile.id);
    const allowedTiers = requesterFeatures?.tierVisibility ?? ['ALAAP', 'JATRA', 'AALOK', 'OBHIJAAT'];

    const profilesWithTiers = await Promise.all(
      nearbyProfiles.map(async (profile) => {
        const profileSubscription = await prisma.subscription.findFirst({
          where: {
            profileId: profile.id,
            status: 'active',
            endAt: { gte: new Date() },
          },
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        });
        return {
          ...profile,
          planCode: profileSubscription?.plan?.code || 'ALAAP',
        };
      })
    );

    const visibleNearbyProfiles = profilesWithTiers.filter((profile) => {
      return allowedTiers.includes(profile.planCode);
    });

    logger.info('Nearby profiles fetched (stub - city match only)', {
      userId,
      effectiveUserId,
      userCity,
      count: visibleNearbyProfiles.length,
    });

    const enrichedNearbyProfiles = await this.attachInterestStatus(
      effectiveUserId,
      visibleNearbyProfiles
    );

    console.log(enrichedNearbyProfiles);

    return enrichedNearbyProfiles;
  }

  private async applyAdvancedRanking(user: Profile, profiles: Profile[]) {
    const results = [];

    for (const p of profiles) {
      // ------------------------------
      // 1️⃣ Weight-based scoring
      // ------------------------------
      const weightScore = this.computeWeightedScore(user, p);

      // ------------------------------
      // 2️⃣ ML-based compatibility
      // ------------------------------
      const mlScore = await this.computeMLCompatibility(user, p);

      const finalScore = weightScore * 0.7 + mlScore * 0.3;

      results.push({
        ...p,
        rankingScore: finalScore
      });
    }

    // Sort highest → lowest
    return results.sort((a, b) => b.rankingScore - a.rankingScore);
  }

  private computeWeightedScore(user: Profile, other: Profile) {
    let score = 0;

    // Age match (normalized)
    if (user.dob && other.dob) {
      const userAge = this.getAge(user.dob);
      const otherAge = this.getAge(other.dob);
      const diff = Math.abs(userAge - otherAge);
      score += (1 - Math.min(diff / 20, 1)) * 0.25;
    }

    // Height
    if (user.height && other.height) {
      const diff = Math.abs(user.height.toNumber() - other.height.toNumber());
      score += (1 - Math.min(diff / 40, 1)) * 0.15;
    }

    // Religion
    if (user.religion && user.religion === other.religion) score += 0.20;

    // Profession
    if (user.profession && user.profession === other.profession) score += 0.15;

    // Education
    if (user.highestEducation && user.highestEducation === other.highestEducation)
      score += 0.10;

    // Location distance
    // const distanceKm = this.calculateDistance(user.location, other.location);
    // if (!isNaN(distanceKm)) {
    //   const normalized = Math.max(0, 1 - distanceKm / 100);
    //   score += normalized * 0.15;
    // }

    return score;
  }

  private async computeMLCompatibility(user: Profile, other: Profile) {
    // Example feature vector
    const features = [
      this.getAge(user.dob) - this.getAge(other.dob),
      (user.height?.toNumber() ?? 0) - (other.height?.toNumber() ?? 0),
      user.religion === other.religion ? 1 : 0,
      user.profession === other.profession ? 1 : 0,
      user.highestEducation === other.highestEducation ? 1 : 0,
      // this.calculateDistance(user.location, other.location),
    ];

    // Very simple ML: negative distance, small linear regression
    const weights = [-0.05, -0.03, 0.8, 0.7, 0.6, -0.01];
    let score = 0;

    for (let i = 0; i < features.length; i++) {
      score += features[i] * weights[i];
    }

    // Normalize 0–1
    return 1 / (1 + Math.exp(-score));
  }

  // private calculateDistance(loc1: any, loc2: any): number {
  //   if (!loc1?.lat || !loc1?.lng || !loc2?.lat || !loc2?.lng) return NaN;

  //   const R = 6371;
  //   const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  //   const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;

  //   const a =
  //     Math.sin(dLat / 2) ** 2 +
  //     Math.cos(loc1.lat * Math.PI / 180) *
  //     Math.cos(loc2.lat * Math.PI / 180) *
  //     Math.sin(dLng / 2) ** 2;

  //   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // }

  private getAge(dob: string | Date | null): number {
    if (!dob) return NaN;

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return NaN; // invalid date

    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const dayDiff = today.getDate() - birthDate.getDate();

    // If birthday hasn't occurred yet this year, subtract 1
    if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
      age--;
    }

    return age;
  }




  /**
   * Use the same role logic as elsewhere:
   * - self/candidate → use own userId
   * - parent        → use linked candidate's profile.userId via CandidateLink
   */
  private async resolveCandidateUserId(userId: string): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('user not found');
    }

    if (user.role === 'self' || user.role === 'candidate') {
      return userId;
    }

    if (user.role === 'parent') {
      const link = await prisma.candidateLink.findFirst({
        where: {
          parentUserId: userId,
          status: 'active',
        },
        include: { profile: true },
      });

      const linkedProfileUserId = link?.profile.userId;

      if (!linkedProfileUserId) {
        throw new Error('No active candidate profile linked to this parent');
      }

      return linkedProfileUserId;
    }
    if (user.role === 'guardian') {
      const link = await prisma.candidateLink.findFirst({
        where: {
          childUserId: userId,
          status: 'active',
        },
        include: { profile: true },
      });

      const linkedProfileUserId = link?.profile.userId;

      if (!linkedProfileUserId) {
        throw new Error('No active candidate profile linked to this parent');
      }

      return linkedProfileUserId;
    }

    // If you add guardian or other roles later, extend this logic here.
    return userId;
  }

  private async attachInterestStatus(
    requesterUserId: string,
    profiles: any[]
  ) {
    if (!profiles.length) return profiles;

    // Fetch all interests involving the requester
    const interests = await prisma.interest.findMany({
      where: {
        OR: [
          { fromUserId: requesterUserId },
          { toUserId: requesterUserId },
        ],
      },
      select: {
        fromUserId: true,
        toUserId: true,
        status: true,
        updatedAt: true,
      },
    });

    // Build lookup map: otherUserId -> interest info
    const interestMap = new Map<
      string,
      { status: string; direction: 'sent' | 'received' }
    >();

    for (const interest of interests) {
      const otherUserId =
        interest.fromUserId === requesterUserId
          ? interest.toUserId
          : interest.fromUserId;

      interestMap.set(otherUserId, {
        status: interest.status,
        direction:
          interest.fromUserId === requesterUserId ? 'sent' : 'received',
      });
    }

    // Attach interest info to profiles
    return profiles.map((profile: any) => {
      const interest = interestMap.get(profile.userId);

      return {
        ...profile,
        interest: interest
          ? {
            status: interest.status,       // pending | accepted | declined | withdrawn
            direction: interest.direction, // sent | received
          }
          : null,
      };
    });
  }
}

export const recommendationService = new RecommendationService();
