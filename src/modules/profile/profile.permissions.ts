import { ProfileData, MaskedProfile, RequesterContext, PhotoData } from './profile.types.js';
import { logger } from '../../utils/logger.js';

import { prisma } from '../../prisma.js';


export class ProfilePermissions {
  // async maskProfile(profile: ProfileData, requester: RequesterContext): Promise<MaskedProfile> {
  //   const canActOnProfile = await this.canActOnProfile(profile, requester);
  //   const isOwner = canActOnProfile; // owner or linked (self/candidate/parent/guardian)
  //   const isGuardian = requester.isGuardian || false;
  //   const isPremium = requester.isPremium || false;

  //   const age = profile.dob ? this.calculateAge(profile.dob) : undefined;

  //   const maskedProfile: MaskedProfile = {
  //     id: profile.id,
  //     displayName: profile.displayName || '',
  //     // completeness: profile.completeness,
  //   };

  //   // Full visibility for the "owner" (self/candidate) or linked parent/guardian
  //   if (isOwner) {
  //     return {
  //       ...maskedProfile,
  //       headline: profile.headline,
  //       about: profile.about,
  //       gender: profile.gender,
  //       age,
  //       location: profile.location,
  //       photos: profile.photos,
  //       preferences: profile.preferences,
  //     };
  //   }

  //   // Non-owners can't see unpublished profiles
  //   if (!profile.published) {
  //     logger.warn('Attempted to view unpublished profile', {
  //       profileId: profile.id,
  //       requesterId: requester.userId,
  //     });
  //     throw new Error('Profile is not published');
  //   }

  //   // Guardian or premium: see more details, but still masked location
  //   if (isGuardian || isPremium) {
  //     maskedProfile.headline = profile.headline;
  //     maskedProfile.about = profile.about;
  //     maskedProfile.gender = profile.gender;
  //     maskedProfile.age = age;
  //     maskedProfile.location = this.maskLocation(profile.location);
  //     maskedProfile.photos = this.filterPhotos(profile.photos || [], 'all');
  //     maskedProfile.preferences = profile.preferences;
  //   } else {
  //     // Regular viewer: limited about + only public photos
  //     maskedProfile.headline = profile.headline;
  //     maskedProfile.about = this.maskAbout(profile.about);
  //     maskedProfile.gender = profile.gender;
  //     maskedProfile.age = age;
  //     maskedProfile.location = this.maskLocation(profile.location);
  //     maskedProfile.photos = this.filterPhotos(profile.photos || [], 'public');
  //   }

  //   return maskedProfile;
  // }

  async maskProfile(
    profile: ProfileData,
    requester: RequesterContext | any
  ): Promise<MaskedProfile> {
    const canActOnProfile = await this.canActOnProfile(profile, requester);
    const isOwner = canActOnProfile;
    const isGuardian = requester.isGuardian || false;
    const isPremium = requester.isPremium || false;

    const age = profile.dob ? this.calculateAge(profile.dob) : undefined;

    // ⬇️ PRESERVE INTEREST
    const interest = profile.interest ?? null;

    // Base masked profile with mandatory fields
    const maskedProfile: MaskedProfile = {
      id: profile.id,
      userId: profile.userId,
      registeredUserId: profile.registeredUserId,
      displayName: profile.displayName || '',
      user: profile.user, // ✅ include user details (name) if present
      interest, // ✅ always included
      createdAt: profile.createdAt,
    };

    //
    // FULL ACCESS (owner / guardian linked)
    //
    if (isOwner) {
      return {
        ...maskedProfile,

        headline: profile.headline,
        about: profile.about,
        gender: profile.gender,
        age,
        location: profile.location,

        // Demographics
        height: profile.height,
        weight: profile.weight,
        highestEducation: profile.highestEducation,
        fieldOfStudy: profile.fieldOfStudy,
        profession: profile.profession,
        religion: profile.religion,
        ancestralHome: profile.ancestralHome,
        division: profile.division,

        // Family
        maritalStatus: profile.maritalStatus,
        fatherOccupation: profile.fatherOccupation,
        motherOccupation: profile.motherOccupation,
        siblingsCount: profile.siblingsCount,
        childrenCount: profile.childrenCount,
        childrenStatus: profile.childrenStatus,

        // Lifestyle
        hobbies: profile.hobbies,
        dietPreference: profile.dietPreference,
        smokingHabit: profile.smokingHabit,
        drinkingHabit: profile.drinkingHabit,
        exerciseRoutine: profile.exerciseRoutine,
        petPreference: profile.petPreference,
        livingSituation: profile.livingSituation,

        // Partner Preferences
        prefAgeRangeFrom: profile.prefAgeRangeFrom,
        prefAgeRangeTo: profile.prefAgeRangeTo,
        prefHeightFrom: profile.prefHeightFrom,
        prefHeightTo: profile.prefHeightTo,
        prefLocation: profile.prefLocation,
        prefEducation: profile.prefEducation,
        prefProfession: profile.prefProfession,
        prefReligion: profile.prefReligion,
        prefMaritalStatus: profile.prefMaritalStatus,
        prefChildrenCount: profile.prefChildrenCount,
        prefChildrenStatus: profile.prefChildrenStatus,
        prefDietPreference: profile.prefDietPreference,
        prefSmokingHabit: profile.prefSmokingHabit,
        prefDrinkingHabit: profile.prefDrinkingHabit,

        // Photos (all photos)
        photos: profile.photos || [],
      };
    }

    //
    // Non-owners cannot view unpublished profiles
    //
    if (!profile.published) {
      logger.warn('Attempted to view unpublished profile', {
        profileId: profile.id,
        requesterId: requester.userId,
      });
      throw new Error('Profile is not published');
    }

    //
    // GUARDIAN or PREMIUM or CONNECTED: see more details (but location masked)
    //
    if (isGuardian || isPremium || (requester as any).isConnected) {
      return {
        ...maskedProfile,

        headline: profile.headline,
        about: profile.about,
        gender: profile.gender,
        age,
        location: this.maskLocation(profile.location),

        // Demographics
        height: profile.height,
        weight: profile.weight,
        highestEducation: profile.highestEducation,
        fieldOfStudy: profile.fieldOfStudy,
        profession: profile.profession,
        religion: profile.religion,
        ancestralHome: profile.ancestralHome,
        division: profile.division,

        // Family
        maritalStatus: profile.maritalStatus,
        fatherOccupation: profile.fatherOccupation,
        motherOccupation: profile.motherOccupation,
        siblingsCount: profile.siblingsCount,
        childrenCount: profile.childrenCount,
        childrenStatus: profile.childrenStatus,

        // Lifestyle
        hobbies: profile.hobbies,
        dietPreference: profile.dietPreference,
        smokingHabit: profile.smokingHabit,
        drinkingHabit: profile.drinkingHabit,
        exerciseRoutine: profile.exerciseRoutine,
        petPreference: profile.petPreference,
        livingSituation: profile.livingSituation,

        // Partner Preferences
        prefAgeRangeFrom: profile.prefAgeRangeFrom,
        prefAgeRangeTo: profile.prefAgeRangeTo,
        prefHeightFrom: profile.prefHeightFrom,
        prefHeightTo: profile.prefHeightTo,
        prefLocation: profile.prefLocation,
        prefEducation: profile.prefEducation,
        prefProfession: profile.prefProfession,
        prefReligion: profile.prefReligion,
        prefMaritalStatus: profile.prefMaritalStatus,
        prefChildrenCount: profile.prefChildrenCount,
        prefChildrenStatus: profile.prefChildrenStatus,
        prefDietPreference: profile.prefDietPreference,
        prefSmokingHabit: profile.prefSmokingHabit,
        prefDrinkingHabit: profile.prefDrinkingHabit,

        // Photos (all)
        photos: this.filterPhotos(profile.photos || [], 'all'),
      };
    }

    //
    // REGULAR VIEWER: partial visibility
    //
    return {
      ...maskedProfile,

      headline: profile.headline,
      about: this.maskAbout(profile.about),
      gender: profile.gender,
      age,
      location: this.maskLocation(profile.location),

      // Demographics
      height: profile.height,
      weight: profile.weight,
      highestEducation: profile.highestEducation,
      fieldOfStudy: profile.fieldOfStudy,
      profession: profile.profession,
      religion: profile.religion,
      ancestralHome: profile.ancestralHome,
      division: profile.division,

      // Family
      maritalStatus: profile.maritalStatus,
      fatherOccupation: profile.fatherOccupation,
      motherOccupation: profile.motherOccupation,
      siblingsCount: profile.siblingsCount,
      childrenCount: profile.childrenCount,
      childrenStatus: profile.childrenStatus,

      // Lifestyle
      hobbies: profile.hobbies,
      dietPreference: profile.dietPreference,
      smokingHabit: profile.smokingHabit,
      drinkingHabit: profile.drinkingHabit,
      exerciseRoutine: profile.exerciseRoutine,
      petPreference: profile.petPreference,
      livingSituation: profile.livingSituation,

      // Partner Preferences
      prefAgeRangeFrom: profile.prefAgeRangeFrom,
      prefAgeRangeTo: profile.prefAgeRangeTo,
      prefHeightFrom: profile.prefHeightFrom,
      prefHeightTo: profile.prefHeightTo,
      prefLocation: profile.prefLocation,
      prefEducation: profile.prefEducation,
      prefProfession: profile.prefProfession,
      prefReligion: profile.prefReligion,
      prefMaritalStatus: profile.prefMaritalStatus,
      prefChildrenCount: profile.prefChildrenCount,
      prefChildrenStatus: profile.prefChildrenStatus,
      prefDietPreference: profile.prefDietPreference,
      prefSmokingHabit: profile.prefSmokingHabit,
      prefDrinkingHabit: profile.prefDrinkingHabit,

      // Photos (public only, blurred if viewed profile has no subscription)
      photos: await this.filterPhotosWithMembershipCheck(profile.id, profile.photos || [], 'public'),
    };
  }


  async canViewProfile(profile: ProfileData, requester: RequesterContext): Promise<boolean> {
    // Owner / linked parent / linked guardian can always view
    if (await this.canActOnProfile(profile, requester)) {
      return true;
    }

    // Others can only view if published
    if (!profile.published) {
      return false;
    }

    return true;
  }

  async canEditProfile(profile: ProfileData, requester: RequesterContext): Promise<boolean> {
    // Same role logic as in service: self/candidate owner, or linked parent/guardian via CandidateLink
    return this.canActOnProfile(profile, requester);
  }

  async canPublishProfile(profile: ProfileData, requester: RequesterContext): Promise<boolean> {
    // Same rule as edit: only owner / linked parent/guardian
    return this.canActOnProfile(profile, requester);
  }

  private calculateAge(dob: Date): number {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  private maskAbout(about?: string): string | undefined {
    if (!about) return undefined;

    if (about.length <= 150) {
      return about;
    }

    return about.substring(0, 150) + '...';
  }

  private maskLocation(location: any): any {
    if (!location || typeof location !== 'object') {
      return undefined;
    }

    return {
      city: location.city,
      state: location.state,
      country: location.country,
    };
  }

  private filterPhotos(photos: PhotoData[], level: 'public' | 'all'): PhotoData[] {
    if (level === 'all') {
      return photos.map(p => ({
        ...p,
        url: p.objectKey ? `/api/v1/media/${p.id}` : undefined,
      }));
    }

    return photos
      .filter((photo) => photo.privacyLevel === 'public')
      .map(p => ({
        ...p,
        url: p.objectKey ? `/api/v1/media/${p.id}` : undefined,
      }));
  }

  private async filterPhotosWithMembershipCheck(profileId: string, photos: PhotoData[], level: 'public' | 'all'): Promise<PhotoData[]> {
    // 1 Filter by privacy
    let filtered = this.filterPhotos(photos, level);

    // 2 Check if the viewed profile has an active subscription
    const hasActiveSubscription = await prisma.subscription.count({
      where: {
        profileId,
        status: 'active',
        endAt: { gte: new Date() },
      },
    }) > 0;

    if (!hasActiveSubscription) {
      // 3 Blur if no membership (or whatever requirement) - Keep URL but rely on backend enforcement
      return filtered.map(p => ({
        ...p,
        url: `/api/v1/media/${p.id}`,
        objectKey: undefined, // Remove key to prevent reconstruction
        isBlurred: true, // Signal frontend to show blur
      }));
    }

    // Has subscription: return photos with URLs
    return filtered;
  }

  /**
   * Centralised role-based rule:
   * - self / candidate  → requester.userId === profile.userId
   * - parent / guardian → requester.linkedProfileUserId === profile.userId
   */
  private async canActOnProfile(profile: ProfileData, requester: RequesterContext): Promise<boolean> {
    // console.log("requesterUserID: " + requester)
    const user = await prisma.user.findUnique({ where: { id: requester.userId } });

    if (!user) {
      // For parent/guardian: you might eventually want to return a different shape
      // (e.g. list of profiles), but for now we enforce "must have at least one profile"
      throw new Error('user not found');
    }



    if (user.role === 'self' || user.role === 'candidate') {
      return requester.userId === profile.userId;
    }

    if (user.role === 'parent') {
      const link = await prisma.candidateLink.findFirst({
        where: {
          parentUserId: requester.userId,
          status: 'active',
        },
        include: {
          profile: true,
        },
      });

      const linkedProfileUserId = link?.profile.userId;
      return linkedProfileUserId === profile.userId;
    }

    return false;
  }
}

export const profilePermissions = new ProfilePermissions();
