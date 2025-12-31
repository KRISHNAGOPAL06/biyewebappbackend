import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ProfileService } from './profile.service.js';
import { CompletenessService } from './completeness.service.js';
import { ProfilePermissions } from './profile.permissions.js';

describe('ProfileService', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    profileService = new ProfileService();
  });

  describe('createProfile', () => {
    it('should create a new profile with initial data', async () => {
      const userId = 'user-123';
      const dto = {
        displayName: 'John Doe',
        headline: 'Software Engineer',
        about: 'I am a passionate developer...',
      };

      const profile = await profileService.createProfile(userId, dto);

      expect(profile).toBeDefined();
      expect(profile.userId).toBe(userId);
      expect(profile.displayName).toBe(dto.displayName);
      expect(profile.published).toBe(false);
      expect(profile.completeness).toBeGreaterThanOrEqual(0);
    });

    it('should throw error if profile already exists', async () => {
      const userId = 'user-123';
      const dto = {
        displayName: 'John Doe',
      };

      await profileService.createProfile(userId, dto);

      await expect(profileService.createProfile(userId, dto)).rejects.toThrow(
        'Profile already exists'
      );
    });
  });

  describe('updateProfileStep', () => {
    it('should update about step', async () => {
      const userId = 'user-123';
      const profile = await profileService.createProfile(userId, {
        displayName: 'John Doe',
      });

      const stepData = {
        step: 'about' as const,
        data: {
          about: 'This is a longer about section with at least 50 characters to pass validation.',
          headline: 'New headline',
        },
      };

      const updated = await profileService.updateProfileStep(profile.id, userId, stepData);

      expect(updated.about).toBe(stepData.data.about);
      expect(updated.headline).toBe(stepData.data.headline);
    });

    it('should update demographics step', async () => {
      const userId = 'user-123';
      const profile = await profileService.createProfile(userId, {
        displayName: 'John Doe',
      });

      const stepData = {
        step: 'demographics' as const,
        data: {
          gender: 'male' as const,
          dob: '1990-01-01',
        },
      };

      const updated = await profileService.updateProfileStep(profile.id, userId, stepData);

      expect(updated.gender).toBe('male');
      expect(updated.dob).toBeDefined();
    });

    it('should throw error if user is not owner', async () => {
      const userId = 'user-123';
      const otherUserId = 'user-456';

      const profile = await profileService.createProfile(userId, {
        displayName: 'John Doe',
      });

      const stepData = {
        step: 'about' as const,
        data: {
          about: 'Trying to update someone else profile',
        },
      };

      await expect(
        profileService.updateProfileStep(profile.id, otherUserId, stepData)
      ).rejects.toThrow('permission');
    });
  });

  describe('publishProfile', () => {
    it('should throw error if required fields are missing', async () => {
      const userId = 'user-123';
      const profile = await profileService.createProfile(userId, {
        displayName: 'John Doe',
      });

      await expect(profileService.publishProfile(profile.id, userId)).rejects.toThrow(
        'Missing required fields'
      );
    });

    it('should publish profile if all required fields are present', async () => {
      const userId = 'user-123';
      const profile = await profileService.createProfile(userId, {
        displayName: 'John Doe',
        headline: 'Software Engineer',
        about: 'This is a detailed about section with more than 50 characters.',
      });

      await profileService.updateProfileStep(profile.id, userId, {
        step: 'demographics',
        data: {
          gender: 'male',
          dob: '1990-01-01',
        },
      });

      await profileService.updateProfileStep(profile.id, userId, {
        step: 'location',
        data: {
          location: {
            city: 'New York',
            state: 'NY',
            country: 'USA',
          },
        },
      });

      await profileService.updateProfileStep(profile.id, userId, {
        step: 'photos-metadata',
        data: {
          photos: [
            {
              objectKey: 'photo-1.jpg',
              url: 'https://example.com/photo-1.jpg',
              fileSize: 1024,
              privacyLevel: 'public' as const,
            },
          ],
        },
      });

      const published = await profileService.publishProfile(profile.id, userId);

      expect(published.published).toBe(true);
    });
  });
});

describe('CompletenessService', () => {
  let completenessService: CompletenessService;

  beforeEach(() => {
    completenessService = new CompletenessService();
  });

  describe('calculateCompleteness', () => {
    it('should return 0 for empty profile', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: '',
        completeness: 0,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = completenessService.calculateCompleteness(profile);

      expect(score).toBe(0);
    });

    it('should calculate correct score for partial profile', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        gender: 'male',
        dob: new Date('1990-01-01'),
        completeness: 0,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = completenessService.calculateCompleteness(profile);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should return 100 for complete profile', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        headline: 'Software Engineer from NYC',
        about:
          'I am a passionate software engineer with 5+ years of experience in building web applications.',
        gender: 'male',
        dob: new Date('1990-01-01'),
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA',
        },
        photos: [{ id: 'photo-1' }],
        preferences: {
          basic: { ageRange: { min: 25, max: 35 } },
        },
        completeness: 0,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const score = completenessService.calculateCompleteness(profile);

      expect(score).toBe(100);
    });
  });

  describe('canPublish', () => {
    it('should return false and missing fields for incomplete profile', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        completeness: 0,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = completenessService.canPublish(profile);

      expect(result.canPublish).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });

    it('should return true for complete profile', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        headline: 'Software Engineer from NYC',
        about:
          'I am a passionate software engineer with 5+ years of experience in building web applications.',
        gender: 'male',
        dob: new Date('1990-01-01'),
        location: {
          city: 'New York',
          state: 'NY',
          country: 'USA',
        },
        photos: [{ id: 'photo-1' }],
        completeness: 100,
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = completenessService.canPublish(profile);

      expect(result.canPublish).toBe(true);
      expect(result.missingFields.length).toBe(0);
    });
  });
});

describe('ProfilePermissions', () => {
  let profilePermissions: ProfilePermissions;

  beforeEach(() => {
    profilePermissions = new ProfilePermissions();
  });

  describe('maskProfile', () => {
    it('should not mask profile for owner', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        about: 'Full about section',
        published: true,
        completeness: 100,
      };

      const requester = {
        userId: 'user-123',
        isOwner: true,
      };

      const masked = profilePermissions.maskProfile(profile, requester);

      expect(masked.about).toBe(profile.about);
    });

    it('should mask about for non-premium visitors', () => {
      const longAbout = 'A'.repeat(200);

      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        about: longAbout,
        published: true,
        completeness: 100,
      };

      const requester = {
        userId: 'user-456',
        isOwner: false,
        isPremium: false,
      };

      const masked = profilePermissions.maskProfile(profile, requester);

      expect(masked.about?.length).toBeLessThan(longAbout.length);
      expect(masked.about).toContain('...');
    });

    it('should filter private photos for non-premium visitors', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        published: true,
        completeness: 100,
        photos: [
          { id: 'photo-1', privacyLevel: 'public' },
          { id: 'photo-2', privacyLevel: 'private' },
        ],
      };

      const requester = {
        userId: 'user-456',
        isOwner: false,
        isPremium: false,
      };

      const masked = profilePermissions.maskProfile(profile, requester);

      expect(masked.photos?.length).toBe(1);
      expect(masked.photos?.[0].privacyLevel).toBe('public');
    });

    it('should throw error for unpublished profile when not owner', () => {
      const profile: any = {
        id: 'profile-123',
        userId: 'user-123',
        displayName: 'John Doe',
        published: false,
        completeness: 50,
      };

      const requester = {
        userId: 'user-456',
        isOwner: false,
      };

      expect(() => profilePermissions.maskProfile(profile, requester)).toThrow(
        'not published'
      );
    });
  });
});
