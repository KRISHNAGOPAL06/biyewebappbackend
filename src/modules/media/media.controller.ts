import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service.js';
import { CreateUploadUrlDTO } from './upload.dto.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export class MediaController {
  async createUploadUrl(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateUploadUrlDTO = req.body;
      const userId = req.userId!;

      logger.info('Creating upload URL', {
        userId,
        profileId: dto.profileId,
        requestId: req.requestId,
      });

      const result = await mediaService.createUploadUrl(dto, userId);

      return sendSuccess(res, result, 'Upload URL created successfully', 201);
    } catch (error) {
      return next(error);
    }
  }
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoId } = req.body;
      const userId = req.userId!;
      if (!req.file) throw new Error('No file uploaded');

      const result = await mediaService.uploadFile(photoId, userId, req.file.buffer);
      return sendSuccess(res, result, 'File uploaded', 200);
    } catch (error) {
      return next(error);
    }
  }

  async getPhotoById(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoId } = req.params;
      const userId = req.userId;

      const fileData = await mediaService.getPhotoFile(photoId, userId);

      if (!fileData) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Photo not found or you do not have permission to view it',
            code: 'PHOTO_NOT_FOUND',
          },
        });
      }

      // Add CORS headers for images
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Content-Type', fileData.mimeType);

      // Stream the file
      const { createReadStream } = await import('fs');
      const stream = createReadStream(fileData.path);

      stream.on('error', (err) => {
        logger.error('Error streaming file', { photoId, error: err });
        res.status(404).end();
      });

      stream.pipe(res);
    } catch (error) {
      return next(error);
    }
  }

  async deletePhoto(req: Request, res: Response, next: NextFunction) {
    try {
      const { photoId } = req.params;
      const userId = req.userId!;

      await mediaService.deletePhoto(photoId, userId);

      return sendSuccess(res, null, 'Photo deleted successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async updatePrivacyForProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId } = req.params;
      const { privacyLevel } = req.body;
      const userId = req.userId!;

      const result = await mediaService.updatePhotoPrivacyForProfile(
        profileId,
        userId,
        privacyLevel
      );

      return sendSuccess(
        res,
        result,
        `Privacy updated for ${result.updatedCount} photo(s)`,
        200
      );
    } catch (error) {
      return next(error);
    }
  }


  async listProfilePhotos(req: Request, res: Response, next: NextFunction) {
    try {
      const { profileId } = req.params;
      const userId = req.userId;

      const photos = await mediaService.listProfilePhotos(profileId, userId);

      return sendSuccess(res, photos, 'Photos retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const mediaController = new MediaController();
