import { z } from 'zod';

export const CreateProfileSchema = z.object({
  displayName: z.string().optional(),
  headline: z.string().optional(),
  about: z.string().optional(),
});

export const UpdateAboutStepSchema = z.object({
  about: z.string().min(50, 'About section must be at least 50 characters'),
  headline: z.string().min(10, 'Headline must be at least 10 characters').optional(),
});

export const UpdateDemographicsStepSchema = z.object({
  gender: z.preprocess((val) => (typeof val === 'string' ? val.toLowerCase() : val), z.enum(['male', 'female', 'other'])),
  dob: z.string().refine((date) => {
    const birthDate = new Date(date);
    const age = new Date().getFullYear() - birthDate.getFullYear();
    return age >= 18 && age <= 100;
  }, 'Age must be between 18 and 100'),
});

export const UpdateFamilyStepSchema = z.object({
  familyDetails: z.object({
    fatherName: z.string().optional(),
    motherName: z.string().optional(),
    siblings: z.number().int().min(0).optional(),
    familyType: z.enum(['nuclear', 'joint']).optional(),
    familyValues: z.enum(['traditional', 'moderate', 'liberal']).optional(),
  }),
});

export const UpdateLifestyleStepSchema = z.object({
  lifestyle: z.object({
    diet: z.enum(['vegetarian', 'non-vegetarian', 'vegan', 'other']).optional(),
    drinking: z.enum(['never', 'occasionally', 'socially', 'regularly']).optional(),
    smoking: z.enum(['never', 'occasionally', 'regularly']).optional(),
    maritalStatus: z.enum(['never_married', 'divorced', 'widowed', 'separated']).optional(),
  }),
});

export const UpdateLocationStepSchema = z.object({
  location: z.object({
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2),
    coordinates: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .optional(),
  }),
});

export const UpdatePhotosMetadataStepSchema = z.object({
  photos: z.array(
    z.object({
      objectKey: z.string(),
      url: z.string().url(),
      fileSize: z.number().int().positive(),
      privacyLevel: z.enum(['public', 'private', 'on_request']).default('public'),
    })
  ),
});

export const UpdatePreferencesStepSchema = z.object({
  preferences: z.object({
    basic: z
      .object({
        ageRange: z.object({
          min: z.number().int().min(18),
          max: z.number().int().max(100),
        }),
        heightRange: z
          .object({
            min: z.number(),
            max: z.number(),
          })
          .optional(),
        maritalStatus: z.array(z.string()).optional(),
      })
      .optional(),
    lifestyle: z
      .object({
        diet: z.array(z.string()).optional(),
        drinking: z.array(z.string()).optional(),
        smoking: z.array(z.string()).optional(),
      })
      .optional(),
    education: z
      .object({
        minEducation: z.string().optional(),
        fieldOfStudy: z.array(z.string()).optional(),
      })
      .optional(),
    community: z
      .object({
        religion: z.array(z.string()).optional(),
        caste: z.array(z.string()).optional(),
        motherTongue: z.array(z.string()).optional(),
      })
      .optional(),
    location: z
      .object({
        cities: z.array(z.string()).optional(),
        countries: z.array(z.string()).optional(),
        willingToRelocate: z.boolean().optional(),
      })
      .optional(),
  }),
});

// Expanded Profile Wizard Schemas
const expandedAboutMeSchema = z.object({
  headline: z.string().optional(),
  description: z.string().optional(),
  languagesKnown: z.array(z.string()).optional(),
});

const expandedDemographicsSchema = z.object({
  height: z.number().optional(),
  weight: z.number().optional(),
  highestEducation: z.string().optional(),
  fieldOfStudy: z.string().optional(),
  profession: z.string().optional(),
  religion: z.string().optional(),
  ancestralHome: z.string().optional(),
  division: z.string().optional(),
});

// Helper for snake_case normalization
const toSnakeCase = (val: unknown) => typeof val === 'string' ? val.toLowerCase().replace(/ /g, '_') : val;

const expandedFamilySchema = z.object({
  maritalStatus: z.preprocess(toSnakeCase, z.string().optional()),
  fatherOccupation: z.string().optional(),
  motherOccupation: z.string().optional(),
  siblingsCount: z.number().optional(),
  childrenCount: z.number().optional(),
  childrenStatus: z.string().optional(),
});

const expandedLifestyleSchema = z.object({
  hobbies: z.array(z.string()).optional(),
  dietPreference: z.string().optional(),
  smokingHabit: z.string().optional(),
  drinkingHabit: z.string().optional(),
  exerciseRoutine: z.string().optional(),
  petPreference: z.string().optional(),
  livingSituation: z.string().optional(),
});

const expandedPartnerPreferenceSchema = z.object({
  prefAgeRangeFrom: z.number().optional(),
  prefAgeRangeTo: z.number().optional(),
  prefHeightFrom: z.number().optional(),
  prefHeightTo: z.number().optional(),
  prefLocation: z.any().optional(),
  prefEducation: z.string().optional(),
  prefProfession: z.string().optional(),
  prefReligion: z.string().optional(),
  prefMaritalStatus: z.string().optional(),
  prefChildrenCount: z.number().optional(),
  prefChildrenStatus: z.string().optional(),
  prefDietPreference: z.string().optional(),
  prefSmokingHabit: z.string().optional(),
  prefDrinkingHabit: z.string().optional(),
});

export const StepUpdateSchema = z.discriminatedUnion('step', [
  z.object({ step: z.literal('about'), data: UpdateAboutStepSchema }),
  z.object({ step: z.literal('demographics'), data: UpdateDemographicsStepSchema }),
  z.object({ step: z.literal('family'), data: UpdateFamilyStepSchema }),
  z.object({ step: z.literal('lifestyle'), data: UpdateLifestyleStepSchema }),
  z.object({ step: z.literal('location'), data: UpdateLocationStepSchema }),
  z.object({ step: z.literal('photos-metadata'), data: UpdatePhotosMetadataStepSchema }),
  z.object({ step: z.literal('preferences'), data: UpdatePreferencesStepSchema }),
  z.object({ step: z.literal('about-me-expanded'), data: expandedAboutMeSchema }),
  z.object({ step: z.literal('demographics-expanded'), data: expandedDemographicsSchema }),
  z.object({ step: z.literal('family-expanded'), data: expandedFamilySchema }),
  z.object({ step: z.literal('lifestyle-expanded'), data: expandedLifestyleSchema }),
  z.object({ step: z.literal('partner-preferences'), data: expandedPartnerPreferenceSchema }),
]);

export type CreateProfileDTO = z.infer<typeof CreateProfileSchema>;
export type UpdateAboutStepDTO = z.infer<typeof UpdateAboutStepSchema>;
export type UpdateDemographicsStepDTO = z.infer<typeof UpdateDemographicsStepSchema>;
export type UpdateFamilyStepDTO = z.infer<typeof UpdateFamilyStepSchema>;
export type UpdateLifestyleStepDTO = z.infer<typeof UpdateLifestyleStepSchema>;
export type UpdateLocationStepDTO = z.infer<typeof UpdateLocationStepSchema>;
export type UpdatePhotosMetadataStepDTO = z.infer<typeof UpdatePhotosMetadataStepSchema>;
export type UpdatePreferencesStepDTO = z.infer<typeof UpdatePreferencesStepSchema>;
export type StepUpdateDTO = z.infer<typeof StepUpdateSchema>;
