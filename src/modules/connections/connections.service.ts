import { SendInterestDTO, AcceptInterestDTO, DeclineInterestDTO, WithdrawInterestDTO } from './connections.dto.js';
import { ProfileData } from '../profile/profile.types.js';

import { interestRateLimitService } from './interestRateLimit.service.js';
import { logger } from '../../utils/logger.js';
import { eventBus } from '../../events/eventBus.js';
import { profilePermissions } from '../profile/profile.permissions.js';


import { prisma } from '../../prisma.js';

export class ConnectionsService {
  async sendInterest(fromUserId: string, dto: SendInterestDTO) {
    const { toUserId } = dto;

    if (fromUserId === toUserId) {
      throw new Error('Cannot send interest to yourself');
    }

    const fromProfile = await prisma.profile.findFirst({
      where: { userId: fromUserId },
    });

    if (!fromProfile || !fromProfile.published) {
      throw new Error('You must have a published profile to send interests');
    }

    const toProfile = await prisma.profile.findFirst({
      where: { userId: toUserId },
    });
    console.log(toProfile)

    if (!toProfile || !toProfile.published) {
      throw new Error('Target profile not found or not published');
    }

    const canSend = await interestRateLimitService.checkRateLimit(fromUserId);
    if (!canSend) {
      const remaining = await interestRateLimitService.getRemainingCount(fromUserId);
      throw new Error(`LIMIT_REACHED: You have reached your daily limit of 20 interests. Remaining: ${remaining}`);
    }

    const existingInterest = await prisma.interest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId,
        },
      },
    });

    console.log(existingInterest);

    if (existingInterest) {
      if (existingInterest.status === 'pending') {
        logger.info('Interest already exists with pending status', {
          fromUserId,
          toUserId,
          interestId: existingInterest.id,
        });
        return {
          id: existingInterest.id,
          status: 'pending',
          createdAt: existingInterest.createdAt,
        };
      }

      if (existingInterest.status === 'declined' || existingInterest.status === 'withdrawn') {
        const updated = await prisma.interest.update({
          where: { id: existingInterest.id },
          data: { status: 'pending', updatedAt: new Date() },
        });

        await interestRateLimitService.incrementRateLimit(fromUserId);

        logger.info('Interest re-sent (updated from declined/withdrawn to pending)', {
          fromUserId,
          toUserId,
          interestId: updated.id,
        });

        return {
          id: updated.id,
          status: 'pending',
          createdAt: updated.createdAt,
        };
      }

      if (existingInterest.status === 'accepted') {
        console.log("accepted: Interest Already accepted")
        throw new Error('Interest already accepted');
      }
    }

    const interest = await prisma.interest.create({
      data: {
        fromUserId,
        toUserId,
        status: 'pending',
      },
    });

    await interestRateLimitService.incrementRateLimit(fromUserId);

    logger.info('Interest sent successfully', {
      fromUserId,
      toUserId,
      interestId: interest.id,
    });
    let user = await prisma.user.findUnique({ where: { id: fromUserId }, include: { profile: true } });

    // Emit notification
    eventBus.emitNotification({
      userId: toUserId,
      type: "interest_received",
      metadata: {
        fromName: user?.profile?.registeredUserId,
        fromUserId: fromUserId
      },
      priority: "HIGH"
    });

    return {
      id: interest.id,
      status: 'pending',
      createdAt: interest.createdAt,
    };
  }

  async acceptInterest(userId: string, dto: AcceptInterestDTO) {
    const { fromUserId } = dto;

    const interest = await prisma.interest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId: userId,
        },
      },
    });

    if (!interest) {
      throw new Error('Interest not found');
    }

    if (interest.status !== 'pending') {
      throw new Error(`Interest is not pending (current status: ${interest.status})`);
    }

    const updated = await prisma.interest.update({
      where: { id: interest.id },
      data: { status: 'accepted', updatedAt: new Date() },
    });

    const reverseInterest = await prisma.interest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: userId,
          toUserId: fromUserId,
        },
      },
    });
    let updatedReverse;
    if (reverseInterest) {
      updatedReverse = await prisma.interest.update({
        where: { id: reverseInterest.id },
        data: { status: 'accepted', updatedAt: new Date() },
      });
    }



    const isMatch = reverseInterest?.status === 'accepted';

    logger.info('Interest accepted', {
      fromUserId,
      toUserId: userId,
      interestId: updated.id,
      isMatch,
    });

    return {
      id: updated.id,
      reverseId: updatedReverse?.id,
      status: 'accepted',
      isMatch,
      updatedAt: updated.updatedAt,
    };
  }

  async declineInterest(userId: string, dto: DeclineInterestDTO) {
    const { fromUserId } = dto;

    const interest = await prisma.interest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId,
          toUserId: userId,
        },
      },
    });

    if (!interest) {
      throw new Error('Interest not found');
    }

    if (interest.status !== 'pending') {
      throw new Error(`Interest is not pending (current status: ${interest.status})`);
    }

    const updated = await prisma.interest.update({
      where: { id: interest.id },
      data: { status: 'declined', updatedAt: new Date() },
    });

    logger.info('Interest declined', {
      fromUserId,
      toUserId: userId,
      interestId: updated.id,
    });

    return {
      id: updated.id,
      status: 'declined',
      updatedAt: updated.updatedAt,
    };
  }

  async withdrawInterest(userId: string, dto: WithdrawInterestDTO) {
    const { toUserId } = dto;

    const interest = await prisma.interest.findUnique({
      where: {
        fromUserId_toUserId: {
          fromUserId: userId,
          toUserId,
        },
      },
    });

    if (!interest) {
      throw new Error('Interest not found');
    }

    if (interest.fromUserId !== userId) {
      throw new Error('Unauthorized: You can only withdraw your own sent interests');
    }

    if (interest.status === 'withdrawn') {
      return {
        id: interest.id,
        status: 'withdrawn',
        updatedAt: interest.updatedAt,
      };
    }

    const updated = await prisma.interest.update({
      where: { id: interest.id },
      data: { status: 'withdrawn', updatedAt: new Date() },
    });

    logger.info('Interest withdrawn', {
      fromUserId: userId,
      toUserId,
      interestId: updated.id,
    });

    return {
      id: updated.id,
      status: 'withdrawn',
      updatedAt: updated.updatedAt,
    };
  }

  // async getSentInterests(userId: string) {
  //   const interests = await prisma.interest.findMany({
  //     where: {
  //       fromUserId: userId,
  //       status: { in: ['pending', 'accepted'] },
  //     },
  //     include: {
  //       toUser: {
  //         select: {
  //           id: true,
  //           email: true,
  //           createdAt: true,
  //         },
  //       },
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return interests.map((interest: any) => ({
  //     id: interest.id,
  //     toUserId: interest.toUserId,
  //     toUser: interest.toUser,
  //     status: interest.status,
  //     createdAt: interest.createdAt,
  //     updatedAt: interest.updatedAt,
  //   }));
  // }

  //   async getSentInterests(userId: string, requester: RequesterContext) {
  //   const interests = await prisma.interest.findMany({
  //     where: {
  //       fromUserId: userId,
  //       status: { in: ['pending', 'accepted'] },
  //     },
  //     include: {
  //       toUser: {
  //         include: {
  //           profile: true,
  //         },
  //       },
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return Promise.all(
  //     interests.map(async (interest: any) => {
  //       const profileData = interest.toUser?.profile
  //         ? this.mapProfile(interest.toUser.profile)
  //         : null;

  //       const maskedProfile = profileData
  //         ? await profilePermissions.maskProfile(profileData, requester)
  //         : null;

  //       return {
  //         id: interest.id,
  //         toUserId: interest.toUserId,
  //         toUser: interest.toUser,
  //         toUserProfile: maskedProfile,
  //         status: interest.status,
  //         createdAt: interest.createdAt,
  //         updatedAt: interest.updatedAt,
  //       };
  //     })
  //   );
  // }

  async getSentInterests(requester: { userId: string }) {
    const interests = await prisma.interest.findMany({
      where: {
        fromUserId: requester?.userId,
        status: { in: ['pending', 'accepted'] },
      },
      include: {
        toUser: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            // profile: true,
            profile: {
              include: {
                photos: true,   // ✅ FIX — include photos
              }
            }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // console.log(interests[0].toUser.profile)
    console.log(interests)
    // console.log(userId)


    return Promise.all(
      interests.map(async (interest: any) => ({
        id: interest.id,
        toUserId: interest.toUserId,
        toUser: interest.toUser,
        toUserProfile: interest.toUser?.profile
          ?
          await profilePermissions.maskProfile(interest.toUser.profile, requester)
          : null,
        status: interest.status,
        createdAt: interest.createdAt,
        updatedAt: interest.updatedAt,
      }))
    );
  }



  // async getReceivedInterests(userId: string) {
  //   const interests = await prisma.interest.findMany({
  //     where: {
  //       toUserId: userId,
  //       status: { in: ['pending', 'accepted'] },
  //     },
  //     include: {
  //       fromUser: {
  //         select: {
  //           id: true,
  //           email: true,
  //           createdAt: true,
  //         },
  //       },
  //     },
  //     orderBy: { createdAt: 'desc' },
  //   });

  //   return interests.map((interest: any) => ({
  //     id: interest.id,
  //     fromUserId: interest.fromUserId,
  //     fromUser: interest.fromUser,
  //     status: interest.status,
  //     createdAt: interest.createdAt,
  //     updatedAt: interest.updatedAt,
  //   }));
  // }

  // async getMatches(userId: string) {
  //   const sentAccepted = await prisma.interest.findMany({
  //     where: {
  //       fromUserId: userId,
  //       status: 'accepted',
  //     },
  //     include: {
  //       toUser: {
  //         select: {
  //           id: true,
  //           email: true,
  //           createdAt: true,
  //         },
  //       },
  //     },
  //   });

  //   const matches = [];

  //   for (const sent of sentAccepted) {
  //     const reverseMatch = await prisma.interest.findUnique({
  //       where: {
  //         fromUserId_toUserId: {
  //           fromUserId: sent.toUserId,
  //           toUserId: userId,
  //         },
  //       },
  //     });

  //     if (reverseMatch?.status === 'accepted') {
  //       matches.push({
  //         matchedUserId: sent.toUserId,
  //         matchedUser: sent.toUser,
  //         matchedAt: sent.updatedAt > reverseMatch.updatedAt ? sent.updatedAt : reverseMatch.updatedAt,
  //       });
  //     }
  //   }

  //   logger.info('Matches retrieved', { userId, matchCount: matches.length });

  //   return matches;
  // }

  //   private mapProfile(db: any): ProfileData {
  //   if (!db) return null as any;

  //   return {
  //     id: db.id,
  //     userId: db.userId,
  //     registeredUserId: db.registeredUserId,

  //     displayName: db.displayName,
  //     headline: db.headline,
  //     about: db.about,
  //     gender: db.gender,
  //     dob: db.dob,
  //     location: db.location,
  //     published: db.published,
  //     completeness: db.completeness,

  //     description: db.description,
  //     languagesKnown: db.languagesKnown || [],

  //     height: db.height,
  //     weight: db.weight,
  //     highestEducation: db.highestEducation,
  //     fieldOfStudy: db.fieldOfStudy,
  //     profession: db.profession,
  //     religion: db.religion,
  //     ancestralHome: db.ancestralHome,
  //     division: db.division,

  //     maritalStatus: db.maritalStatus,
  //     fatherOccupation: db.fatherOccupation,
  //     motherOccupation: db.motherOccupation,
  //     siblingsCount: db.siblingsCount,
  //     childrenCount: db.childrenCount,
  //     childrenStatus: db.childrenStatus,

  //     hobbies: db.hobbies || [],
  //     dietPreference: db.dietPreference,
  //     smokingHabit: db.smokingHabit,
  //     drinkingHabit: db.drinkingHabit,
  //     exerciseRoutine: db.exerciseRoutine,
  //     petPreference: db.petPreference,
  //     livingSituation: db.livingSituation,

  //     preferences: db.preferences,
  //     photos: db.photos,

  //     createdAt: db.createdAt,
  //     updatedAt: db.updatedAt,
  //     deletedAt: db.deletedAt,
  //   };
  // }

  async getReceivedInterests(requester: { userId: string }) {
    const interests = await prisma.interest.findMany({
      where: {
        toUserId: requester.userId,
        status: { in: ['pending', 'accepted'] },
      },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            profile: {
              include: {
                photos: true,   // ✅ FIX — include photos
              }
            }
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    console.log("interestsstart")
    console.log(interests)
    console.log("interestsend")

    return Promise.all(
      interests.map(async (interest: any) => ({
        id: interest.id,
        fromUserId: interest.fromUserId,
        fromUser: interest.fromUser,
        fromUserProfile: interest.fromUser?.profile
          ? await profilePermissions.maskProfile(interest.fromUser.profile, requester)
          : null,
        status: interest.status,
        createdAt: interest.createdAt,
        updatedAt: interest.updatedAt,
      }))
    );
  }


  // async getMatches(requester: { userId: string }) {
  //   const sentAccepted = await prisma.interest.findMany({
  //     where: {
  //       fromUserId: requester.userId,
  //       status: 'accepted',
  //     },
  //     include: {
  //       toUser: {
  //         select: {
  //           id: true,
  //           email: true,
  //           createdAt: true,
  //           profile: {
  //             include: {
  //               photos: true,   // ✅ FIX — include photos
  //             }
  //           }
  //         },
  //       },
  //     },
  //   });

  //   console.log(sentAccepted)

  //   const matches = [];

  //   for (const sent of sentAccepted) {
  //     const reverseMatch = await prisma.interest.findUnique({
  //       where: {
  //         fromUserId_toUserId: {
  //           fromUserId: sent.toUserId,
  //           toUserId: requester.userId,
  //         },
  //       },
  //       include: {
  //         fromUser: {
  //           select: {
  //             id: true,
  //             email: true,
  //             createdAt: true,
  //             profile: {
  //               include: {
  //                 photos: true,   // ✅ FIX — include photos
  //               }
  //             }
  //           },
  //         },
  //       },
  //     });

  //     if (reverseMatch?.status === 'accepted') {
  //       const matchedUser = sent.toUser;

  //       // ✅ Map Prisma profile to ProfileData
  //       const profileData = matchedUser?.profile
  //         ? this.mapProfile(matchedUser.profile)
  //         : null;

  //       // ✅ Mask the profile
  //       const matchedProfile = profileData
  //         ? await profilePermissions.maskProfile(profileData, requester)
  //         : null;

  //       matches.push({
  //         matchedUserId: sent.toUserId,
  //         matchedUser: matchedUser,
  //         matchedUserProfile: matchedProfile,
  //         matchedAt:
  //           sent.updatedAt > reverseMatch.updatedAt
  //             ? sent.updatedAt
  //             : reverseMatch.updatedAt,
  //       });
  //     }
  //   }

  //   logger.info('Matches retrieved', {
  //     requester,
  //     matchCount: matches.length,
  //   });

  //   return matches;
  // }
  // async getMatches(requester: { userId: string }) {
  //   // 2️⃣ Find interests SENT by candidate and accepted
  //   const sentAccepted = await prisma.interest.findMany({
  //     where: {
  //       fromUserId: requester.userId,
  //       status: 'accepted',
  //     },
  //     include: {
  //       toUser: {
  //         select: {
  //           id: true,
  //           email: true,
  //           createdAt: true,
  //           profile: {
  //             include: {
  //               photos: true,
  //             },
  //           },
  //         },
  //       },
  //     },
  //   });


  //   const matches = [];
  //   console.log(sentAccepted)

  //   for (const sent of sentAccepted) {
  //     // 4️⃣ Find reverse MATCH: the other user also accepted
  //     const reverseMatch = await prisma.interest.findFirst({
  //       where: {
  //         OR: [
  //           {
  //             fromUserId: sent.toUserId,
  //             toUserId: requester.userId,
  //           },
  //           {
  //             fromUserId: requester.userId,
  //             toUserId: sent.toUserId,
  //           }
  //         ]
  //       },
  //       include: {
  //         fromUser: {
  //           select: {
  //             id: true,
  //             email: true,
  //             createdAt: true,
  //             profile: {
  //               include: {
  //                 photos: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });
  //     console.log(reverseMatch)

  //     // 5️⃣ Only count when BOTH sides accepted
  //     if (reverseMatch?.status === 'accepted') {
  //       const matchedUser = sent.toUser;

  //       // Map Prisma profile → ProfileData
  //       const profileData = matchedUser?.profile
  //         ? this.mapProfile(matchedUser.profile)
  //         : null;

  //       // Mask profile based on permissions
  //       const matchedProfile = profileData
  //         ? await profilePermissions.maskProfile(profileData, requester)
  //         : null;

  //       matches.push({
  //         matchedUserId: sent.toUserId,
  //         matchedUser,
  //         matchedUserProfile: matchedProfile,
  //         matchedAt:
  //           sent.updatedAt > reverseMatch.updatedAt
  //             ? sent.updatedAt
  //             : reverseMatch.updatedAt,
  //       });
  //     }
  //   }

  //   logger.info('Matches retrieved', {
  //     userId: requester.userId,
  //     resolvedCandidateId: requester.userId,
  //     matchCount: matches.length,
  //   });

  //   return matches;
  // }
  async getMatches(requester: { userId: string }) {
    // 2️⃣ Find interests ACCEPTED where requester is sender OR receiver
    const sentAccepted = await prisma.interest.findMany({
      where: {
        status: 'accepted',
        OR: [
          { fromUserId: requester.userId },
          { toUserId: requester.userId },
        ],
      },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            profile: {
              include: {
                photos: true,
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            profile: {
              include: {
                photos: true,
              },
            },
          },
        },
      },
    });

    const matches = [];
    console.log(sentAccepted);

    for (const sent of sentAccepted) {
      // Determine the other user (sender or receiver)
      const matchedUser =
        sent.fromUserId === requester.userId
          ? sent.toUser
          : sent.fromUser;

      // Map Prisma profile → ProfileData
      const profileData = matchedUser?.profile
        ? this.mapProfile(matchedUser.profile)
        : null;

      // Mask profile based on permissions
      const matchedProfile = profileData
        ? await profilePermissions.maskProfile(profileData, requester)
        : null;

      matches.push({
        matchedUserId: matchedUser.id,
        matchedUser,
        matchedUserProfile: matchedProfile,
        matchedAt: sent.updatedAt,
      });
    }

    logger.info('Matches retrieved', {
      userId: requester.userId,
      resolvedCandidateId: requester.userId,
      matchCount: matches.length,
    });

    return matches;
  }



  private mapProfile(db: any): ProfileData {
    if (!db) return null as any;

    return {
      id: db.id,
      userId: db.userId,
      registeredUserId: db.registeredUserId,

      // Convert null → undefined
      displayName: db.displayName ?? undefined,
      headline: db.headline ?? undefined,
      about: db.about ?? undefined,
      gender: db.gender ?? undefined,

      dob: db.dob ?? undefined,
      location: db.location ?? undefined,
      published: db.published,
      completeness: db.completeness,

      description: db.description ?? undefined,
      languagesKnown: db.languagesKnown || [],

      height: db.height ?? undefined,
      weight: db.weight ?? undefined,
      highestEducation: db.highestEducation ?? undefined,
      fieldOfStudy: db.fieldOfStudy ?? undefined,
      profession: db.profession ?? undefined,
      religion: db.religion ?? undefined,
      ancestralHome: db.ancestralHome ?? undefined,
      division: db.division ?? undefined,

      maritalStatus: db.maritalStatus ?? undefined,
      fatherOccupation: db.fatherOccupation ?? undefined,
      motherOccupation: db.motherOccupation ?? undefined,
      siblingsCount: db.siblingsCount ?? undefined,
      childrenCount: db.childrenCount ?? undefined,
      childrenStatus: db.childrenStatus ?? undefined,

      hobbies: db.hobbies || [],
      dietPreference: db.dietPreference ?? undefined,
      smokingHabit: db.smokingHabit ?? undefined,
      drinkingHabit: db.drinkingHabit ?? undefined,
      exerciseRoutine: db.exerciseRoutine ?? undefined,
      petPreference: db.petPreference ?? undefined,
      livingSituation: db.livingSituation ?? undefined,

      photos: db.photos ?? [],

      createdAt: db.createdAt,
      updatedAt: db.updatedAt,
      deletedAt: db.deletedAt ?? undefined,
    };
  }

  // private async resolveCandidateUserId(userId: string): Promise<string> {
  //   const user = await prisma.user.findUnique({ where: { id: userId } });

  //   if (!user) {
  //     throw new Error('user not found');
  //   }

  //   if (user.role === 'self' || user.role === 'candidate') {
  //     return userId;
  //   }

  //   if (user.role === 'parent') {
  //     const link = await prisma.candidateLink.findFirst({
  //       where: {
  //         parentUserId: userId,
  //         status: 'active',
  //       },
  //       include: {
  //         profile: true,
  //       },
  //     });

  //     const linkedProfileUserId = link?.profile.userId;

  //     if (!linkedProfileUserId) {
  //       throw new Error('No active candidate profile linked to this parent');
  //     }

  //     return linkedProfileUserId;
  //   }
  //   if (user.role === 'guardian') {
  //     const link = await prisma.candidateLink.findFirst({
  //       where: {
  //         childUserId: userId,
  //         status: 'active',
  //       },
  //       include: { profile: true },
  //     });

  //     const linkedProfileUserId = link?.profile.userId;

  //     if (!linkedProfileUserId) {
  //       throw new Error('No active candidate profile linked to this parent');
  //     }

  //     return linkedProfileUserId;
  //   }

  //   // Other roles (if any) just act as themselves for now
  //   return userId;
  // }



}

export const connectionsService = new ConnectionsService();
