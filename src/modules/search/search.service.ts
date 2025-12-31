import { SearchRequestDTO } from '../discovery/search.dto.js';
import { validateQueryCost } from '../../utils/queryCostGuard.js';
import { decodeCursor, createPaginationResult } from '../../utils/pagination.js';
import { profilePermissions } from '../profile/profile.permissions.js';
import { cacheService } from '../../utils/cache.service.js';
import { logger } from '../../utils/logger.js';
import { entitlementService } from '../payments/entitlement.service.js';

import { prisma } from '../../prisma.js';

export class SearchService {
  async search(userId: string, dto: SearchRequestDTO) {
    const costCheck = validateQueryCost({ basic: dto.basic, advanced: dto.advanced });

    if (!costCheck.allowed) {
      logger.warn('Query cost limit exceeded', {
        userId,
        cost: costCheck.cost,
        maxCost: costCheck.maxCost,
      });
      throw new Error(`QUERY_TOO_EXPENSIVE: Cost ${costCheck.cost} exceeds maximum ${costCheck.maxCost}`);
    }

    const cursor = dto.cursor ? decodeCursor(dto.cursor) : null;

    const useCache = this.shouldCacheQuery(dto);

    if (useCache) {
      const cacheKey = this.buildCacheKey(userId, dto);
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.info('Returning cached search results', { userId, cacheKey });
        return cached;
      }
    }

    const whereClause = await this.buildWhereClause(userId, dto, cursor);
    console.log(whereClause)

    const profiles = await prisma.profile.findMany({
      where: whereClause,
      take: dto.limit + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        photos: {
          where: {
            moderationStatus: 'approved',
            deletedAt: null,
          },
        },
        preferences: true,
      },
    });
    console.log(profiles)

    // ----------------------------------------
    // Tier Visibility Filtering
    // ----------------------------------------
    const effectiveUserId = await this.resolveCandidateUserId(userId);
    const userProfile = await prisma.profile.findUnique({
      where: { userId: effectiveUserId },
    });

    let visibleProfiles = profiles;
    if (userProfile) {
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

      visibleProfiles = profilesWithTiers.filter((profile) => {
        return allowedTiers.includes(profile.planCode);
      });

      logger.debug('Tier visibility filtering (search)', {
        requesterId: userProfile.id,
        allowedTiers,
        totalProfiles: profiles.length,
        visibleProfiles: visibleProfiles.length,
      });
    }

    const enrichedRecommendations = await this.attachInterestStatus(
      effectiveUserId,
      visibleProfiles
    );

    const maskedProfiles = await Promise.all(
      enrichedRecommendations.map((profile: any) =>
        profilePermissions.maskProfile(profile as any, { userId })
      )
    );
    console.log(maskedProfiles)


    const result = createPaginationResult(visibleProfiles, dto.limit);

    // Ensure we return the same number of items as result.data
    const slicedMasked = maskedProfiles.slice(0, result.data.length);

    if (useCache) {
      const cacheKey = this.buildCacheKey(userId, dto);
      await cacheService.set(cacheKey, { ...result, data: slicedMasked }, 30);
    }

    return { ...result, data: slicedMasked };

    // const maskedProfiles = await profiles.map((profile: any) =>
    //   profilePermissions.maskProfile(profile as any, { userId })
    // );
    // const maskedProfiles = await Promise.all(
    //   profiles.map((profile: any) =>
    //     profilePermissions.maskProfile(profile as any, { userId })
    //   )
    // );
    // console.log(maskedProfiles)


    // const result = createPaginationResult(profiles, dto.limit);
    // console.log(result)

    // if (useCache) {
    //   const cacheKey = this.buildCacheKey(userId, dto);
    //   await cacheService.set(cacheKey, { ...result, data: maskedProfiles }, 30);
    // }

    // logger.info('Search completed', {
    //   userId,
    //   resultCount: result.data.length,
    //   hasNextCursor: !!result.nextCursor,
    //   queryCost: costCheck.cost,
    // });

    // return { ...result, data: maskedProfiles };
  }

  // private async buildWhereClause(userId: string, dto: SearchRequestDTO, cursor: any): Promise<any> {
  //   const effectiveUserId = await this.resolveCandidateUserId(userId);
  //   const where: any = {
  //     published: true,
  //     deletedAt: null,
  //     userId: { not: effectiveUserId },
  //   };

  //   if (cursor) {
  //     where.OR = [
  //       {
  //         createdAt: { lt: cursor.createdAt },
  //       },
  //       {
  //         createdAt: cursor.createdAt,
  //         id: { lt: cursor.id },
  //       },
  //     ];
  //   }

  //   if (dto.basic) {
  //     if (dto.basic.ageRange) {
  //       const [minAge, maxAge] = dto.basic.ageRange;
  //       const maxDate = this.getDateFromAge(minAge);
  //       const minDate = this.getDateFromAge(maxAge);
  //       where.dob = { gte: minDate, lte: maxDate };
  //     }

  //     if (dto.basic.maritalStatus && dto.basic.maritalStatus.length > 0) {
  //     }

  //     if (dto.basic.religion) {
  //     }

  //     if (dto.basic.location) {
  //       const locationFilters = [];
  //       if (dto.basic.location.city) {
  //         locationFilters.push({
  //           location: {
  //             path: ['city'],
  //             equals: dto.basic.location.city,
  //           },
  //         });
  //       }
  //       if (dto.basic.location.state) {
  //         locationFilters.push({
  //           location: {
  //             path: ['state'],
  //             equals: dto.basic.location.state,
  //           },
  //         });
  //       }
  //       if (dto.basic.location.country) {
  //         locationFilters.push({
  //           location: {
  //             path: ['country'],
  //             equals: dto.basic.location.country,
  //           },
  //         });
  //       }

  //       if (locationFilters.length > 0) {
  //         where.AND = locationFilters;
  //       }
  //     }
  //   }

  //   return where;
  // }

  private async buildWhereClause(
    userId: string,
    dto: SearchRequestDTO,
    cursor: any
  ): Promise<any> {
    const effectiveUserId = await this.resolveCandidateUserId(userId);

    // Fetch user to infer default gender from lookingFor
    const user = await prisma.user.findUnique({
      where: { id: effectiveUserId },
      select: { lookingFor: true, gender: true },
    });

    const where: any = {
      published: true,
      deletedAt: null,
      userId: { not: effectiveUserId },
    };

    const and: any[] = [];

    // 1️⃣ Pagination cursor
    if (cursor) {
      where.OR = [
        {
          createdAt: { lt: cursor.createdAt },
        },
        {
          createdAt: cursor.createdAt,
          id: { lt: cursor.id },
        },
      ];
    }

    const basic = dto.basic;
    const advanced = dto.advanced;

    // Helper to create case-insensitive array match
    // Prisma doesn't support case-insensitive 'in' directly for strings,
    // so we normalize both the filter values and expand to match common formats
    const normalizeForFilter = (values: string[]): string[] => {
      const expanded: string[] = [];
      for (const v of values) {
        const lower = v.toLowerCase();
        const upper = v.toUpperCase();
        const title = v.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        const snake = v.toLowerCase().replace(/\s+/g, '_');
        expanded.push(v, lower, upper, title, snake);
      }
      return [...new Set(expanded)]; // Remove duplicates
    };

    // 2️⃣ Gender: basic.gender OR fallback from user.lookingFor
    if (basic?.gender && basic.gender.length > 0) {
      where.gender = { in: basic.gender.map((g: string) => g.toLowerCase()), mode: 'insensitive' };
    } else if (user?.lookingFor === 'bride') {
      where.gender = { equals: 'female', mode: 'insensitive' };
    } else if (user?.lookingFor === 'groom') {
      where.gender = { equals: 'male', mode: 'insensitive' };
    }
    console.log("basic: " + JSON.stringify(basic))
    console.log("advanced: " + advanced)

    // ----------------------------
    // 3️⃣ BASIC FILTERS
    // ----------------------------
    if (basic) {
      // Age range → dob between [maxAge, minAge]
      if (basic.ageRange) {
        const [minAge, maxAge] = basic.ageRange;
        const maxDate = this.getDateFromAge(minAge); // youngest
        const minDate = this.getDateFromAge(maxAge); // oldest
        where.dob = { gte: minDate, lte: maxDate };
      }

      // Height range
      if (basic.heightRange) {
        const [minH, maxH] = basic.heightRange;
        where.height = {};
        if (minH != null) where.height.gte = minH;
        if (maxH != null) where.height.lte = maxH;
      }

      // Marital status (case-insensitive)
      if (basic.maritalStatus && basic.maritalStatus.length > 0) {
        where.maritalStatus = { in: normalizeForFilter(basic.maritalStatus) };
      }

      // Religion (case-insensitive)
      if (basic.religion && basic.religion.length > 0) {
        where.religion = { in: normalizeForFilter(basic.religion) };
      }

      // Profession (case-insensitive)
      if (basic.profession && basic.profession.length > 0) {
        where.profession = { in: normalizeForFilter(basic.profession) };
      }

      // Highest education (case-insensitive)
      if (basic.highestEducation && basic.highestEducation.length > 0) {
        where.highestEducation = { in: normalizeForFilter(basic.highestEducation) };
      }

      // Languages known (string[])
      if (basic.languagesKnown && basic.languagesKnown.length > 0) {
        and.push({
          languagesKnown: { hasSome: basic.languagesKnown },
        });
      }

      // Hobbies (string[])
      if (basic.hobbies && basic.hobbies.length > 0) {
        and.push({
          hobbies: { hasSome: basic.hobbies },
        });
      }

      // Location (JSON city/state/country)
      if (basic.location) {
        const locationFilters: any[] = [];

        if (basic.location.city) {
          locationFilters.push({
            location: {
              path: ['city'],
              equals: basic.location.city,
            },
          });
        }

        if (basic.location.state) {
          locationFilters.push({
            location: {
              path: ['state'],
              equals: basic.location.state,
            },
          });
        }

        if (basic.location.country) {
          locationFilters.push({
            location: {
              path: ['country'],
              equals: basic.location.country,
            },
          });
        }

        if (locationFilters.length > 0) {
          and.push(...locationFilters);
        }
      }
    }

    // ----------------------------
    // 4️⃣ ADVANCED FILTERS
    // ----------------------------
    if (advanced) {
      // Education & Profession (only if not already set from basic)
      if (!where.highestEducation && advanced.highestEducation && advanced.highestEducation.length > 0) {
        where.highestEducation = { in: advanced.highestEducation };
      }

      if (advanced.fieldOfStudy && advanced.fieldOfStudy.length > 0) {
        where.fieldOfStudy = { in: advanced.fieldOfStudy };
      }

      if (!where.profession && advanced.profession && advanced.profession.length > 0) {
        where.profession = { in: advanced.profession };
      }

      // Lifestyle
      if (advanced.dietPreference && advanced.dietPreference.length > 0) {
        where.dietPreference = { in: advanced.dietPreference };
      }

      if (advanced.smokingHabit && advanced.smokingHabit.length > 0) {
        where.smokingHabit = { in: advanced.smokingHabit };
      }

      if (advanced.drinkingHabit && advanced.drinkingHabit.length > 0) {
        where.drinkingHabit = { in: advanced.drinkingHabit };
      }

      if (advanced.exerciseRoutine && advanced.exerciseRoutine.length > 0) {
        where.exerciseRoutine = { in: advanced.exerciseRoutine };
      }

      if (advanced.livingSituation && advanced.livingSituation.length > 0) {
        where.livingSituation = { in: advanced.livingSituation };
      }

      if (advanced.petPreference && advanced.petPreference.length > 0) {
        where.petPreference = { in: advanced.petPreference };
      }

      // Family
      if (advanced.childrenStatus && advanced.childrenStatus.length > 0) {
        where.childrenStatus = { in: advanced.childrenStatus };
      }

      if (!where.maritalStatus && advanced.maritalStatus && advanced.maritalStatus.length > 0) {
        where.maritalStatus = { in: advanced.maritalStatus };
      }

      // Culture / background
      if (!where.religion && advanced.religion && advanced.religion.length > 0) {
        where.religion = { in: advanced.religion };
      }

      if (advanced.ancestralHome && advanced.ancestralHome.length > 0) {
        where.ancestralHome = { in: advanced.ancestralHome };
      }

      if (advanced.division && advanced.division.length > 0) {
        where.division = { in: advanced.division };
      }

      // Interests
      if (advanced.hobbies && advanced.hobbies.length > 0) {
        and.push({
          hobbies: { hasSome: advanced.hobbies },
        });
      }

      // Advanced location (if not set in basic)
      if (!basic?.location && advanced.location) {
        const locationFilters: any[] = [];

        if (advanced.location.city) {
          locationFilters.push({
            location: {
              path: ['city'],
              equals: advanced.location.city,
            },
          });
        }
        if (advanced.location.state) {
          locationFilters.push({
            location: {
              path: ['state'],
              equals: advanced.location.state,
            },
          });
        }
        if (advanced.location.country) {
          locationFilters.push({
            location: {
              path: ['country'],
              equals: advanced.location.country,
            },
          });
        }

        if (locationFilters.length > 0) {
          and.push(...locationFilters);
        }
      }

      // Partner preference fields (searching for profiles with certain partner prefs)
      if (advanced.prefAgeRange) {
        const [minPref, maxPref] = advanced.prefAgeRange;
        if (minPref != null) {
          and.push({ prefAgeRangeFrom: { gte: minPref } });
        }
        if (maxPref != null) {
          and.push({ prefAgeRangeTo: { lte: maxPref } });
        }
      }

      if (advanced.prefHeightRange) {
        const [minPH, maxPH] = advanced.prefHeightRange;
        if (minPH != null) {
          and.push({ prefHeightFrom: { gte: minPH } });
        }
        if (maxPH != null) {
          and.push({ prefHeightTo: { lte: maxPH } });
        }
      }

      if (advanced.prefReligion && advanced.prefReligion.length > 0) {
        and.push({ prefReligion: { in: advanced.prefReligion } });
      }

      if (advanced.prefProfession && advanced.prefProfession.length > 0) {
        and.push({ prefProfession: { in: advanced.prefProfession } });
      }

      if (advanced.prefMaritalStatus && advanced.prefMaritalStatus.length > 0) {
        and.push({ prefMaritalStatus: { in: advanced.prefMaritalStatus } });
      }

      if (advanced.prefChildrenStatus && advanced.prefChildrenStatus.length > 0) {
        and.push({ prefChildrenStatus: { in: advanced.prefChildrenStatus } });
      }

      if (advanced.prefDietPreference && advanced.prefDietPreference.length > 0) {
        and.push({ prefDietPreference: { in: advanced.prefDietPreference } });
      }

      if (advanced.prefSmokingHabit && advanced.prefSmokingHabit.length > 0) {
        and.push({ prefSmokingHabit: { in: advanced.prefSmokingHabit } });
      }

      if (advanced.prefDrinkingHabit && advanced.prefDrinkingHabit.length > 0) {
        and.push({ prefDrinkingHabit: { in: advanced.prefDrinkingHabit } });
      }

      // prefLocation could be mapped similarly to location, if needed, depending on how you want to use it.
    }

    // ----------------------------
    // 🔍 KEYWORD SEARCH
    // ----------------------------
    if (dto.keyword) {
      const keywordClause = this.buildKeywordSearch(dto.keyword);
      if (keywordClause) {
        and.push(keywordClause);
      }
    }


    // Attach AND conditions if any
    if (and.length > 0) {
      where.AND = and;
    }

    return where;
  }


  private buildKeywordSearch(keyword: string): any {

    const KEYWORD_TEXT_FIELDS = [
      'profession',
      'highestEducation',
      'fieldOfStudy',
      'religion',
      'ancestralHome',
      'division',
    ];
    const KEYWORD_ARRAY_FIELDS = [
      'languagesKnown',
      'hobbies',
    ];
    if (!keyword || !keyword.trim()) return null;

    const words = keyword.trim().split(/\s+/);

    return {
      OR: [
        // Text columns
        ...KEYWORD_TEXT_FIELDS.flatMap(field =>
          words.map(word => ({
            [field]: {
              contains: word,
              mode: 'insensitive',
            },
          }))
        ),

        // Array columns
        ...KEYWORD_ARRAY_FIELDS.flatMap(field =>
          words.map(word => ({
            [field]: {
              has: word,
            },
          }))
        ),

        // JSON location search
        ...words.flatMap(word => [
          {
            location: {
              path: ['city'],
              string_contains: word,
            },
          },
          {
            location: {
              path: ['state'],
              string_contains: word,
            },
          },
          {
            location: {
              path: ['country'],
              string_contains: word,
            },
          },
        ]),
      ],
    };
  }



  private getDateFromAge(age: number): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() - age);
    return date;
  }

  private shouldCacheQuery(dto: SearchRequestDTO): boolean {
    if (dto.advanced) {
      return false;
    }

    if (dto.cursor) {
      return false;
    }

    return true;
  }

  private buildCacheKey(userId: string, dto: SearchRequestDTO): string {
    const parts = [
      'search',
      'user',
      userId,
      JSON.stringify(dto.basic || {}),
      dto.limit.toString(),
    ];
    return parts.join(':');
  }

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

export const searchService = new SearchService();
