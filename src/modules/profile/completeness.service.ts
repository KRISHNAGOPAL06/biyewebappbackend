// import { ProfileData } from './profile.types.js';
// import { logger } from '../../utils/logger.js';

// interface CompletenessWeights {
//   displayName: number;
//   headline: number;
//   about: number;
//   gender: number;
//   dob: number;
//   location: number;
//   photos: number;
//   preferences: number;
// }

// const WEIGHTS: CompletenessWeights = {
//   displayName: 10,
//   headline: 10,
//   about: 15,
//   gender: 10,
//   dob: 10,
//   location: 15,
//   photos: 20,
//   preferences: 10,
// };

// export class CompletenessService {
//   calculateCompleteness(profile: ProfileData): number {
//     let score = 0;

//     if (profile.displayName && profile.displayName.length >= 2) {
//       score += WEIGHTS.displayName;
//     }

//     if (profile.headline && profile.headline.length >= 10) {
//       score += WEIGHTS.headline;
//     }

//     if (profile.about && profile.about.length >= 50) {
//       score += WEIGHTS.about;
//     }

//     if (profile.gender) {
//       score += WEIGHTS.gender;
//     }

//     if (profile.dob) {
//       score += WEIGHTS.dob;
//     }

//     if (profile.location && this.isValidLocation(profile.location)) {
//       score += WEIGHTS.location;
//     }

//     if (profile.photos && profile.photos.length > 0) {
//       score += WEIGHTS.photos;
//     }

//     // if (profile.preferences && this.isValidPreferences(profile.preferences)) {
//     //   score += WEIGHTS.preferences;
//     // }

//     logger.debug('Profile completeness calculated', {
//       profileId: profile.id,
//       score,
//     });

//     return Math.min(score, 100);
//   }

//   getIncompleteSections(profile: ProfileData): string[] {
//     const incomplete: string[] = [];

//     if (!profile.displayName || profile.displayName.length < 2) {
//       incomplete.push('displayName');
//     }

//     if (!profile.headline || profile.headline.length < 10) {
//       incomplete.push('headline');
//     }

//     if (!profile.about || profile.about.length < 50) {
//       incomplete.push('about');
//     }

//     if (!profile.gender) {
//       incomplete.push('gender');
//     }

//     if (!profile.dob) {
//       incomplete.push('dob');
//     }

//     if (!profile.location || !this.isValidLocation(profile.location)) {
//       incomplete.push('location');
//     }

//     if (!profile.photos || profile.photos.length === 0) {
//       incomplete.push('photos');
//     }

//     // if (!profile.preferences || !this.isValidPreferences(profile.preferences)) {
//     //   incomplete.push('preferences');
//     // }

//     return incomplete;
//   }

//   canPublish(profile: ProfileData): { canPublish: boolean; missingFields: string[] } {
//     const missingFields: string[] = [];

//     // if (!profile.displayName || profile.displayName.length < 2) {
//     //   missingFields.push('displayName');
//     // }

//     // if (!profile.gender) {
//     //   missingFields.push('gender');
//     // }

//     // if (!profile.dob) {
//     //   missingFields.push('dob');
//     // }

//     // if (!profile.location || !this.isValidLocation(profile.location)) {
//     //   missingFields.push('location');
//     // }

//     // if (!profile.about || profile.about.length < 50) {
//     //   missingFields.push('about');
//     // }

//     // if (!profile.headline || profile.headline.length < 10) {
//     //   missingFields.push('headline');
//     // }

//     if (!profile.photos || profile.photos.length === 0) {
//       missingFields.push('photos (at least 1 required)');
//     }

//     return {
//       canPublish: missingFields.length === 0,
//       missingFields,
//     };
//   }

//   private isValidLocation(location: any): boolean {
//     return (
//       location &&
//       typeof location === 'object' &&
//       location.city &&
//       location.state &&
//       location.country
//     );
//   }

//   // private isValidPreferences(preferences: any): boolean {
//   //   return preferences && typeof preferences === 'object' && Object.keys(preferences).length > 0;
//   // }
// }

// export const completenessService = new CompletenessService();


import { ProfileData } from './profile.types.js';
import { logger } from '../../utils/logger.js';

// We explicitly design weights so that TOTAL = 70.
// Remaining 30% is reserved for "verified user" outside this service.
const MAX_PROFILE_SCORE = 70;

interface FieldWeights {
  // Basic
  displayName: number;
  headline: number;
  gender: number;
  dob: number;
  location: number;
  photos: number;

  // About
  about: number;
  description: number;

  // Demographics
  height: number;
  highestEducation: number;
  profession: number;
  religion: number;
  ancestralHome: number;
  division: number;

  // Family
  maritalStatus: number;
  siblingsCount: number;
  childrenCount: number;
  childrenStatus: number;
  fatherOccupation: number;
  motherOccupation: number;

  // Lifestyle & Interests
  hobbies: number;
  dietPreference: number;
  smokingHabit: number;
  drinkingHabit: number;
  exerciseRoutine: number;
  livingSituation: number;
  petPreference: number;

  // Partner Preferences (key ones)
  prefAgeRange: number;        // combined from From/To
  prefLocation: number;
  prefReligion: number;
  prefMaritalStatus: number;
}

const WEIGHTS: FieldWeights = {
  // BASIC (20 pts total)
  displayName: 0,
  headline: 4,
  gender: 3,
  dob: 3,
  location: 3,
  photos: 7,

  // ABOUT (10 pts total)
  about: 0,
  description: 10,

  // DEMOGRAPHICS (15 pts total)
  height: 3,
  highestEducation: 4,
  profession: 3,
  religion: 3,
  ancestralHome: 1,
  division: 1,

  // FAMILY (8 pts total)
  maritalStatus: 4,
  siblingsCount: 2,
  childrenCount: 0,
  childrenStatus: 2,
  fatherOccupation: 0, // keep for future if you want to use
  motherOccupation: 0, // keep for future if you want to use

  // LIFESTYLE & INTERESTS (10 pts total)
  hobbies: 4,
  dietPreference: 2,
  smokingHabit: 1,
  drinkingHabit: 1,
  exerciseRoutine: 1,
  livingSituation: 1,
  petPreference: 1,

  // PARTNER PREFERENCES (7 pts total)
  prefAgeRange: 2,
  prefLocation: 3,
  prefReligion: 1,
  prefMaritalStatus: 1,
};

export class CompletenessService {
  /**
   * Calculates profile completeness based ONLY on ProfileData fields.
   * Max score here is 70. Remaining 30% is reserved for "verified user"
   * and should be added externally.
   */
  calculateCompleteness(profile: ProfileData): number {
    let score = 0;

    // ---------- BASIC ----------
    if (profile.displayName && profile.displayName.trim().length >= 2) {
      score += WEIGHTS.displayName;
    }

    if (profile.headline && profile.headline.trim().length >= 10) {
      score += WEIGHTS.headline;
    }

    if (profile.gender) {
      score += WEIGHTS.gender;
    }

    if (profile.dob) {
      score += WEIGHTS.dob;
    }

    if (profile.location && this.isValidLocation(profile.location)) {
      score += WEIGHTS.location;
    }

    if (profile.photos && profile.photos.length > 0) {
      score += WEIGHTS.photos;
    }

    // ---------- ABOUT ----------
    if (profile.about && profile.about.trim().length >= 50) {
      score += WEIGHTS.about;
    }

    if (profile.description && profile.description.trim().length >= 30) {
      score += WEIGHTS.description;
    }

    // ---------- DEMOGRAPHICS ----------
    if (profile.height) {
      score += WEIGHTS.height;
    }

    if (profile.highestEducation) {
      score += WEIGHTS.highestEducation;
    }

    if (profile.profession) {
      score += WEIGHTS.profession;
    }

    if (profile.religion) {
      score += WEIGHTS.religion;
    }

    if (profile.ancestralHome) {
      score += WEIGHTS.ancestralHome;
    }

    if (profile.division) {
      score += WEIGHTS.division;
    }

    // ---------- FAMILY ----------
    if (profile.maritalStatus) {
      score += WEIGHTS.maritalStatus;
    }

    if (profile.siblingsCount !== null && profile.siblingsCount !== undefined) {
      // 0 siblings is valid; only null/undefined is "missing"
      score += WEIGHTS.siblingsCount;
    }

    if (profile.childrenCount !== null && profile.childrenCount !== undefined) {
      score += WEIGHTS.childrenCount;
    }

    if (profile.childrenStatus) {
      score += WEIGHTS.childrenStatus;
    }

    // fatherOccupation / motherOccupation currently 0 weight
    // but we keep these in case you want to add weight later.

    // ---------- LIFESTYLE & INTERESTS ----------
    if (profile.hobbies && profile.hobbies.length > 0) {
      score += WEIGHTS.hobbies;
    }

    if (profile.dietPreference) {
      score += WEIGHTS.dietPreference;
    }

    if (profile.smokingHabit) {
      score += WEIGHTS.smokingHabit;
    }

    if (profile.drinkingHabit) {
      score += WEIGHTS.drinkingHabit;
    }

    if (profile.exerciseRoutine) {
      score += WEIGHTS.exerciseRoutine;
    }

    if (profile.livingSituation) {
      score += WEIGHTS.livingSituation;
    }

    if (profile.petPreference) {
      score += WEIGHTS.petPreference;
    }

    // ---------- PARTNER PREFERENCES ----------
    const hasAgeFrom = profile.prefAgeRangeFrom !== null && profile.prefAgeRangeFrom !== undefined;
    const hasAgeTo = profile.prefAgeRangeTo !== null && profile.prefAgeRangeTo !== undefined;
    if (hasAgeFrom && hasAgeTo) {
      score += WEIGHTS.prefAgeRange;
    }

    if (profile.prefLocation && this.isValidLocation(profile.prefLocation)) {
      score += WEIGHTS.prefLocation;
    }

    if (profile.prefReligion) {
      score += WEIGHTS.prefReligion;
    }

    if (profile.prefMaritalStatus) {
      score += WEIGHTS.prefMaritalStatus;
    }

    logger.debug('Profile completeness calculated', {
      profileId: profile.id,
      score,
      maxProfileScore: MAX_PROFILE_SCORE,
    });
    const incomplete = this.getIncompleteSections(profile)
    console.log(JSON.stringify(incomplete))

    // Clamp to max profile score (70)
    return Math.min(score, MAX_PROFILE_SCORE);
  }

  /**
   * Returns a list of missing/weak fields to help guide the user UI.
   */
  getIncompleteSections(profile: ProfileData): string[] {
    const incomplete: string[] = [];

    // ---------- BASIC ----------
    if (!profile.displayName || profile.displayName.trim().length < 2) {
      incomplete.push('displayName');
    }

    if (!profile.headline || profile.headline.trim().length < 10) {
      incomplete.push('headline');
    }

    if (!profile.gender) {
      incomplete.push('gender');
    }

    if (!profile.dob) {
      incomplete.push('dob');
    }

    if (!profile.location || !this.isValidLocation(profile.location)) {
      incomplete.push('location');
    }

    if (!profile.photos || profile.photos.length === 0) {
      incomplete.push('photos');
    }

    // ---------- ABOUT ----------
    if (!profile.about || profile.about.trim().length < 50) {
      incomplete.push('about');
    }

    if (!profile.description || profile.description.trim().length < 30) {
      incomplete.push('description');
    }

    // ---------- DEMOGRAPHICS ----------
    if (!profile.height) {
      incomplete.push('height');
    }

    if (!profile.highestEducation) {
      incomplete.push('highestEducation');
    }

    if (!profile.profession) {
      incomplete.push('profession');
    }

    if (!profile.religion) {
      incomplete.push('religion');
    }

    if (!profile.ancestralHome) {
      incomplete.push('ancestralHome');
    }

    if (!profile.division) {
      incomplete.push('division');
    }

    // ---------- FAMILY ----------
    if (!profile.maritalStatus) {
      incomplete.push('maritalStatus');
    }

    if (profile.siblingsCount === null || profile.siblingsCount === undefined) {
      incomplete.push('siblingsCount');
    }

    if (profile.childrenCount === null || profile.childrenCount === undefined) {
      incomplete.push('childrenCount');
    }

    if (!profile.childrenStatus) {
      incomplete.push('childrenStatus');
    }

    // ---------- LIFESTYLE & INTERESTS ----------
    if (!profile.hobbies || profile.hobbies.length === 0) {
      incomplete.push('hobbies');
    }

    if (!profile.dietPreference) {
      incomplete.push('dietPreference');
    }

    if (!profile.smokingHabit) {
      incomplete.push('smokingHabit');
    }

    if (!profile.drinkingHabit) {
      incomplete.push('drinkingHabit');
    }

    if (!profile.exerciseRoutine) {
      incomplete.push('exerciseRoutine');
    }

    if (!profile.livingSituation) {
      incomplete.push('livingSituation');
    }

    if (!profile.petPreference) {
      incomplete.push('petPreference');
    }

    // ---------- PARTNER PREFERENCES ----------
    const hasAgeFrom = profile.prefAgeRangeFrom !== null && profile.prefAgeRangeFrom !== undefined;
    const hasAgeTo = profile.prefAgeRangeTo !== null && profile.prefAgeRangeTo !== undefined;
    if (!hasAgeFrom || !hasAgeTo) {
      incomplete.push('prefAgeRange');
    }

    if (!profile.prefLocation || !this.isValidLocation(profile.prefLocation)) {
      incomplete.push('prefLocation');
    }

    if (!profile.prefReligion) {
      incomplete.push('prefReligion');
    }

    if (!profile.prefMaritalStatus) {
      incomplete.push('prefMaritalStatus');
    }

    return incomplete;
  }

  /**
   * Minimal publish rule:
   * For now, only require at least 1 photo.
   * You can tighten this later using getIncompleteSections if needed.
   */
  canPublish(profile: ProfileData): { canPublish: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    if (!profile.photos || profile.photos.length === 0) {
      missingFields.push('photos (at least 1 required)');
    }

    return {
      canPublish: missingFields.length === 0,
      missingFields,
    };
  }

  private isValidLocation(location: any): boolean {
    return (
      location &&
      typeof location === 'object' &&
      location.city &&
      location.state &&
      location.country
    );
  }
}

export const completenessService = new CompletenessService();
