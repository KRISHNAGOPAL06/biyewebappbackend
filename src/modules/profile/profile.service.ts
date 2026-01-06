import { ProfileData, RequesterContext } from './profile.types.js';
import {
  CreateProfileDTO,
  StepUpdateDTO,
} from './profile.dto.js';
import { completenessService } from './completeness.service.js';
import { profilePermissions } from './profile.permissions.js';
import { logger } from '../../utils/logger.js';
import { generateRegisteredUserId } from '../../utils/profileId.generator.js';

import { prisma } from '../../prisma.js';
import { eventBus } from '../../events/eventBus.js';

export class ProfileService {
  private async assertUserCanActOnProfile(
    profile: any,
    userId: string,
    action: 'update' | 'publish' | 'unpublish' | 'delete'
  ): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      // For parent/guardian: you might eventually want to return a different shape
      // (e.g. list of profiles), but for now we enforce "must have at least one profile"
      throw new Error('user not found');
    }

    // 🔍 Resolve the profile differently based on role
    // let profile: Profile | null = null;

    if (user.role === 'self' || user.role === 'candidate') {
      // Self / candidate own their profile directly
      if (profile.userId !== userId) {
        throw new Error(`You do not have permission to ${action} this profile`);
      }
    } else if (user.role === 'parent') {
      // Parent: find a profile via CandidateLink where this user is parent
      const link = await prisma.candidateLink.findFirst({
        where: {
          parentUserId: userId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      if (profile.userId !== link?.profile.userId) {
        throw new Error(`You do not have permission to ${action} this profile`);
      }
    } else if (user.role === 'guardian') {
      // Guardian: find profile via CandidateLink where this user is a childUser
      const link = await prisma.candidateLink.findFirst({
        where: {
          childUserId: userId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      if (profile.userId !== link?.profile.userId) {
        throw new Error(`You do not have permission to ${action} this profile`);
      }
    }
  }

  async createProfile(userId: string, dto: CreateProfileDTO): Promise<ProfileData> {
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        photos: true,
        preferences: true,
      },
    });

    if (existingProfile && !existingProfile.deletedAt) {
      throw new Error('Profile already exists for this user');
    }

    const profile = await prisma.profile.create({
      data: {
        userId,
        registeredUserId: generateRegisteredUserId(),
        displayName: dto.displayName,
        headline: dto.headline,
        about: dto.about,
        published: false,
        completeness: 0,
      },
      include: {
        photos: true,
        preferences: true,
      },
    });

    const completeness = completenessService.calculateCompleteness(profile as ProfileData);

    const updatedProfile = await prisma.profile.update({
      where: { id: profile.id },
      data: { completeness },
      include: {
        photos: true,
        preferences: true,
      },
    });

    logger.info('Profile created', { userId, profileId: updatedProfile.id });

    return updatedProfile as ProfileData;
  }

  async getMyProfile(userId: string): Promise<ProfileData | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      // For parent/guardian: you might eventually want to return a different shape
      // (e.g. list of profiles), but for now we enforce "must have at least one profile"
      throw new Error('user not found');
    }

    let profile;
    //    const profile = await prisma.profile.findUnique({
    //   where: { userId },
    //   include: {
    //     photos: true,
    //     preferences: true,
    //   },
    // });

    if (user.role === 'self' || user.role === 'candidate') {
      // Self / candidate own their profile directly
      profile = await prisma.profile.findUnique({
        where: { userId: userId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
            }
          }
        }
      });
    } else if (user.role === 'parent') {
      // Parent: find a profile via CandidateLink where this user is parent
      const link = await prisma.candidateLink.findFirst({
        where: {
          parentUserId: userId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      profile = link?.profile ?? null;
    } else if (user.role === 'guardian') {
      // Guardian: find profile via CandidateLink where this user is a childUser
      const link = await prisma.candidateLink.findFirst({
        where: {
          childUserId: userId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      profile = link?.profile ?? null;
    }

    // if (!profile) {
    //   // For parent/guardian: you might eventually want to return a different shape
    //   // (e.g. list of profiles), but for now we enforce "must have at least one profile"
    //   throw new Error('Profile not found for user');
    // }




    if (!profile || profile.deletedAt) {
      return null;
    }

    return profile as ProfileData;
  }

  async getProfileById(profileId: string, requester: RequesterContext): Promise<ProfileData> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        photos: true,
        preferences: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          }
        }
      },
    });

    if (!profile || profile.deletedAt) {
      throw new Error('Profile not found');
    }

    const canView = profilePermissions.canViewProfile(profile as ProfileData, requester);

    if (!canView) {
      throw new Error('You do not have permission to view this profile');
    }

    // 🔥 Emit notification if viewer is different from owner
    if (profile.userId !== requester.userId) {
      // Debounce check could go here, but omitted for simplicity
      // We need viewer's name for the notification
      // requester doesn't carry name, so we just use "A user" or fetch it?
      // Let's try to fetch viewer profile name

      // Async fire-and-forget
      (async () => {
        try {
          const viewer = await prisma.profile.findUnique({
            where: { userId: requester.userId },
            select: { registeredUserId: true }
          });

          eventBus.emitNotification({
            userId: profile.userId,
            type: 'profile_view',
            metadata: {
              viewerName: viewer?.registeredUserId || 'A user',
              viewerUserId: requester.userId,
              profileId: profileId
            },
            priority: 'LOW'
          });
        } catch (e) {
          logger.error('Failed to emit profile_view notification', e);
        }
      })();
    }

    return profile as ProfileData;
  }

  async updateProfileStep(
    profileId: string,
    userId: string,
    stepData: StepUpdateDTO
  ): Promise<ProfileData> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        photos: true,
        preferences: true,
      },
    });

    if (!profile || profile.deletedAt) {
      throw new Error('Profile not found');
    }

    await this.assertUserCanActOnProfile(profile, userId, 'update');

    let updatedProfile: any;

    switch (stepData.step) {
      case 'about':
        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: {
            about: stepData.data.about,
            headline: stepData.data.headline || profile.headline,
          },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'demographics':
        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: {
            gender: stepData.data.gender,
            dob: new Date(stepData.data.dob),
          },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'family':
        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: {
            location: {
              ...(profile.location as any),
              family: stepData.data.familyDetails,
            },
          },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'lifestyle':
        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: {
            location: {
              ...(profile.location as any),
              lifestyle: stepData.data.lifestyle,
            },
          },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'location':
        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: {
            location: stepData.data.location,
          },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'photos-metadata':
        await prisma.photo.deleteMany({
          where: { profileId },
        });

        await prisma.photo.createMany({
          data: stepData.data.photos.map((photo) => ({
            profileId,
            objectKey: photo.objectKey,
            url: photo.url,
            fileSize: photo.fileSize,
            privacyLevel: photo.privacyLevel,
          })),
        });

        updatedProfile = await prisma.profile.findUnique({
          where: { id: profileId },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'preferences':
        const existingPreferences = await prisma.preference.findUnique({
          where: { profileId },
        });

        if (existingPreferences) {
          await prisma.preference.update({
            where: { profileId },
            data: {
              basic: (stepData.data.preferences.basic || existingPreferences.basic) as any,
              lifestyle: (stepData.data.preferences.lifestyle || existingPreferences.lifestyle) as any,
              education: (stepData.data.preferences.education || existingPreferences.education) as any,
              community: (stepData.data.preferences.community || existingPreferences.community) as any,
              location: (stepData.data.preferences.location || existingPreferences.location) as any,
            },
          });
        } else {
          await prisma.preference.create({
            data: {
              profileId,
              basic: stepData.data.preferences.basic as any,
              lifestyle: stepData.data.preferences.lifestyle as any,
              education: stepData.data.preferences.education as any,
              community: stepData.data.preferences.community as any,
              location: stepData.data.preferences.location as any,
            },
          });
        }

        updatedProfile = await prisma.profile.findUnique({
          where: { id: profileId },
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'about-me-expanded':
        const aboutMeUpdate: any = {};
        if (stepData.data.headline !== undefined) aboutMeUpdate.headline = stepData.data.headline;
        if (stepData.data.description !== undefined) aboutMeUpdate.description = stepData.data.description;
        if (stepData.data.languagesKnown !== undefined) aboutMeUpdate.languagesKnown = stepData.data.languagesKnown;

        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: aboutMeUpdate,
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'demographics-expanded':
        const demographicsUpdate: any = {};
        if (stepData.data.height !== undefined) demographicsUpdate.height = stepData.data.height;
        if (stepData.data.weight !== undefined) demographicsUpdate.weight = stepData.data.weight;
        if (stepData.data.highestEducation !== undefined) demographicsUpdate.highestEducation = stepData.data.highestEducation;
        if (stepData.data.fieldOfStudy !== undefined) demographicsUpdate.fieldOfStudy = stepData.data.fieldOfStudy;
        if (stepData.data.profession !== undefined) demographicsUpdate.profession = stepData.data.profession;
        if (stepData.data.religion !== undefined) demographicsUpdate.religion = stepData.data.religion;
        if (stepData.data.ancestralHome !== undefined) demographicsUpdate.ancestralHome = stepData.data.ancestralHome;
        if (stepData.data.division !== undefined) demographicsUpdate.division = stepData.data.division;

        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: demographicsUpdate,
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'family-expanded':
        const familyUpdate: any = {};
        if (stepData.data.maritalStatus !== undefined) familyUpdate.maritalStatus = stepData.data.maritalStatus;
        if (stepData.data.fatherOccupation !== undefined) familyUpdate.fatherOccupation = stepData.data.fatherOccupation;
        if (stepData.data.motherOccupation !== undefined) familyUpdate.motherOccupation = stepData.data.motherOccupation;
        if (stepData.data.siblingsCount !== undefined) familyUpdate.siblingsCount = stepData.data.siblingsCount;
        if (stepData.data.childrenCount !== undefined) familyUpdate.childrenCount = stepData.data.childrenCount;
        if (stepData.data.childrenStatus !== undefined) familyUpdate.childrenStatus = stepData.data.childrenStatus;

        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: familyUpdate,
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'lifestyle-expanded':
        const lifestyleUpdate: any = {};
        if (stepData.data.hobbies !== undefined) lifestyleUpdate.hobbies = stepData.data.hobbies;
        if (stepData.data.dietPreference !== undefined) lifestyleUpdate.dietPreference = stepData.data.dietPreference;
        if (stepData.data.smokingHabit !== undefined) lifestyleUpdate.smokingHabit = stepData.data.smokingHabit;
        if (stepData.data.drinkingHabit !== undefined) lifestyleUpdate.drinkingHabit = stepData.data.drinkingHabit;
        if (stepData.data.exerciseRoutine !== undefined) lifestyleUpdate.exerciseRoutine = stepData.data.exerciseRoutine;
        if (stepData.data.petPreference !== undefined) lifestyleUpdate.petPreference = stepData.data.petPreference;
        if (stepData.data.livingSituation !== undefined) lifestyleUpdate.livingSituation = stepData.data.livingSituation;

        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: lifestyleUpdate,
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      case 'partner-preferences':
        const preferencesUpdate: any = {};
        if (stepData.data.prefAgeRangeFrom !== undefined) preferencesUpdate.prefAgeRangeFrom = stepData.data.prefAgeRangeFrom;
        if (stepData.data.prefAgeRangeTo !== undefined) preferencesUpdate.prefAgeRangeTo = stepData.data.prefAgeRangeTo;
        if (stepData.data.prefHeightFrom !== undefined) preferencesUpdate.prefHeightFrom = stepData.data.prefHeightFrom;
        if (stepData.data.prefHeightTo !== undefined) preferencesUpdate.prefHeightTo = stepData.data.prefHeightTo;
        if (stepData.data.prefLocation !== undefined) preferencesUpdate.prefLocation = stepData.data.prefLocation;
        if (stepData.data.prefEducation !== undefined) preferencesUpdate.prefEducation = stepData.data.prefEducation;
        if (stepData.data.prefProfession !== undefined) preferencesUpdate.prefProfession = stepData.data.prefProfession;
        if (stepData.data.prefReligion !== undefined) preferencesUpdate.prefReligion = stepData.data.prefReligion;
        // Convert array to comma-separated string for Prisma String field
        if (stepData.data.prefMaritalStatus !== undefined) {
          preferencesUpdate.prefMaritalStatus = Array.isArray(stepData.data.prefMaritalStatus)
            ? stepData.data.prefMaritalStatus.join(', ')
            : stepData.data.prefMaritalStatus;
        }
        if (stepData.data.prefChildrenCount !== undefined) preferencesUpdate.prefChildrenCount = stepData.data.prefChildrenCount;
        if (stepData.data.prefChildrenStatus !== undefined) preferencesUpdate.prefChildrenStatus = stepData.data.prefChildrenStatus;
        if (stepData.data.prefDietPreference !== undefined) preferencesUpdate.prefDietPreference = stepData.data.prefDietPreference;
        if (stepData.data.prefSmokingHabit !== undefined) preferencesUpdate.prefSmokingHabit = stepData.data.prefSmokingHabit;
        if (stepData.data.prefDrinkingHabit !== undefined) preferencesUpdate.prefDrinkingHabit = stepData.data.prefDrinkingHabit;

        updatedProfile = await prisma.profile.update({
          where: { id: profileId },
          data: preferencesUpdate,
          include: {
            photos: true,
            preferences: true,
          },
        });
        break;

      default:
        throw new Error('Invalid step');
    }

    const profileScore = completenessService.calculateCompleteness(updatedProfile as ProfileData);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      // For parent/guardian: you might eventually want to return a different shape
      // (e.g. list of profiles), but for now we enforce "must have at least one profile"
      throw new Error('user not found');
    }
    const verificationScore = user.isVerified ? 30 : 0;

    const completeness = Math.min(profileScore + verificationScore, 100);

    const finalProfile = await prisma.profile.update({
      where: { id: profileId },
      data: { completeness },
      include: {
        photos: true,
        preferences: true,
      },
    });

    logger.info('Profile step updated', {
      profileId,
      step: stepData.step,
      completeness,
    });

    return finalProfile as ProfileData;
  }

  async publishProfile(profileId: string, userId: string): Promise<ProfileData> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        photos: true,
        preferences: true,
      },
    });

    if (!profile || profile.deletedAt) {
      throw new Error('Profile not found');
    }

    await this.assertUserCanActOnProfile(profile, userId, 'publish');

    const { canPublish, missingFields } = completenessService.canPublish(profile as ProfileData);

    if (!canPublish) {
      throw new Error(
        `Profile cannot be published. Missing required fields: ${missingFields.join(', ')}`
      );
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: profileId },
      data: { published: true },
      include: {
        photos: true,
        preferences: true,
      },
    });

    logger.info('Profile published', { profileId, userId });

    return updatedProfile as ProfileData;
  }

  async unpublishProfile(profileId: string, userId: string): Promise<ProfileData> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile || profile.deletedAt) {
      throw new Error('Profile not found');
    }

    await this.assertUserCanActOnProfile(profile, userId, 'unpublish');

    const updatedProfile = await prisma.profile.update({
      where: { id: profileId },
      data: { published: false },
      include: {
        photos: true,
        preferences: true,
      },
    });

    logger.info('Profile unpublished', { profileId, userId });

    return updatedProfile as ProfileData;
  }

  async softDeleteProfile(profileId: string, userId: string): Promise<void> {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    await this.assertUserCanActOnProfile(profile, userId, 'delete');

    await prisma.profile.update({
      where: { id: profileId },
      data: {
        deletedAt: new Date(),
        published: false,
      },
    });

    logger.info('Profile soft deleted', { profileId, userId });
  }
}

export const profileService = new ProfileService();
