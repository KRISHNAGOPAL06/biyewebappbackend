import { Request, Response, NextFunction } from 'express';
import { profileService } from './profile.service.js';
import { CreateProfileDTO, StepUpdateDTO } from './profile.dto.js';
import { RequesterContext } from './profile.types.js';
import { sendSuccess } from '../../utils/response.js';

export class ProfileController {
  async createProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const dto: CreateProfileDTO = req.body;

      const profile = await profileService.createProfile(userId, dto);

      return sendSuccess(res, profile, 'Profile created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }

  async getMyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      const profile = await profileService.getMyProfile(userId);

      if (!profile) {
        return sendSuccess(res, null, 'No profile found', 404);
      }

      return sendSuccess(res, profile, 'Profile retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getProfileById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

      const requester: RequesterContext = {
        userId,
        isOwner: false,
        isGuardian: false,
        isPremium: false,
      };

      console.log(id);
      console.log(userId);

      const profile = await profileService.getProfileById(id, requester);
      console.log(profile);


      // const maskedProfile = await profilePermissions.maskProfile(profile, requester);
      // console.log(maskedProfile);


      return sendSuccess(res, profile, 'Profile retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async updateProfileStep(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;
      const stepData: StepUpdateDTO = req.body;

      const profile = await profileService.updateProfileStep(id, userId, stepData);

      return sendSuccess(res, profile, 'Profile step updated successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async publishProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

      const profile = await profileService.publishProfile(id, userId);

      return sendSuccess(res, profile, 'Profile published successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async unpublishProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

      const profile = await profileService.unpublishProfile(id, userId);

      return sendSuccess(res, profile, 'Profile unpublished successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async deleteProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = (req as any).userId;

      await profileService.softDeleteProfile(id, userId);

      return sendSuccess(res, null, 'Profile deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const profileController = new ProfileController();
