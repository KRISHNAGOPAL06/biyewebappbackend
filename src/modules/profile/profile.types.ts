// export interface ProfileData {
//   id: string;
//   userId: string;
//   registeredUserId: string;
//   displayName?: string;
//   headline?: string;
//   about?: string;
//   gender?: string;
//   dob?: Date;
//   location?: any;
//   published: boolean;
//   completeness: number;
//   photos?: PhotoData[];
//   preferences?: PreferenceData;
//   createdAt: Date;
//   updatedAt: Date;
//   deletedAt?: Date;
// }

import { Decimal } from "@prisma/client/runtime/library";

export interface ProfileData {
  id: string;
  userId: string;
  registeredUserId: string;
  interest?: {
    status: string;
    direction: 'sent' | 'received';
  } | null;

  // Basic Info
  displayName?: string;
  headline?: string;
  about?: string;
  gender?: string;
  dob?: Date;
  location?: any;

  published: boolean;
  completeness: number;

  // About Me
  description?: string;
  languagesKnown?: string[];

  // Demographics
  height?: Decimal | null;
  weight?: Decimal | null;
  highestEducation?: string;
  fieldOfStudy?: string;
  profession?: string;
  religion?: string;
  ancestralHome?: string;
  division?: string;

  // Family
  maritalStatus?: string;
  fatherOccupation?: string;
  motherOccupation?: string;
  siblingsCount?: number;
  childrenCount?: number;
  childrenStatus?: string;

  // Lifestyle & Interests
  hobbies?: string[];
  dietPreference?: string;
  smokingHabit?: string;
  drinkingHabit?: string;
  exerciseRoutine?: string;
  petPreference?: string;
  livingSituation?: string;

  // Partner Preferences
  prefAgeRangeFrom?: number;
  prefAgeRangeTo?: number;
  prefHeightFrom?: Decimal | null;
  prefHeightTo?: Decimal | null;
  prefLocation?: any;
  prefEducation?: string;
  prefProfession?: string;
  prefReligion?: string;
  prefMaritalStatus?: string;
  prefChildrenCount?: number;
  prefChildrenStatus?: string;
  prefDietPreference?: string;
  prefSmokingHabit?: string;
  prefDrinkingHabit?: string;

  // Photos
  photos?: PhotoData[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  planCode?: string;
}


export interface PhotoData {
  id: string;
  profileId: string;
  objectKey?: string;
  url?: string;
  fileSize?: number;
  privacyLevel: string;
  moderationStatus: string;
  createdAt: Date;
  isBlurred?: boolean;
}

export interface PreferenceData {
  id: string;
  profileId: string;
  basic?: any;
  lifestyle?: any;
  education?: any;
  community?: any;
  location?: any;
  createdAt: Date;
  updatedAt: Date;
}

// export interface MaskedProfile {
//   id: string;
//   displayName: string;
//   headline?: string;
//   about?: string;
//   gender?: string;
//   age?: number;
//   location?: any;
//   completeness: number;
//   photos?: PhotoData[];
//   preferences?: PreferenceData;
// }
export interface MaskedProfile {
  id: string;
  userId: string;
  registeredUserId: string;

  interest?: {
    status: string;
    direction: 'sent' | 'received';
  } | null;


  // Basic Info
  displayName?: string;
  headline?: string;
  about?: string;
  gender?: string;
  age?: number;
  location?: any;

  // Demographics
  height?: Decimal | null;
  weight?: Decimal | null;
  highestEducation?: string;
  fieldOfStudy?: string;
  profession?: string;
  religion?: string;
  ancestralHome?: string;
  division?: string;

  // Family
  maritalStatus?: string;

  // Photos
  photos?: PhotoData[];

  planCode?: string;
}



export interface RequesterContext {
  userId?: string;
  isOwner?: boolean;
  isGuardian?: boolean;
  isPremium?: boolean;
}

export type ProfileStep =
  | 'about'
  | 'demographics'
  | 'family'
  | 'lifestyle'
  | 'location'
  | 'photos-metadata'
  | 'preferences';
