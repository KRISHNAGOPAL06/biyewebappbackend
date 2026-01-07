import { Request, Response, NextFunction } from 'express';
import { mediaService } from './media.service.js';
import { CreateUploadUrlDTO } from './upload.dto.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { agoraService } from './agora.service.js';

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
        // Only header check needed if we haven't sent response yet
        if (!res.headersSent) res.status(404).end();
      });

      if (fileData.access === 'blurred') {
        try {
          const sharp = (await import('sharp')).default;
          const transform = sharp()
            .resize({ width: 200, fit: 'inside' }) // Downscale drastically for security
            .blur(50); // Keep Ultra Heavy blur for security, but allow colors

          stream.pipe(transform).pipe(res);
        } catch (sharpError) {
          logger.error('Sharp processing error', { error: sharpError });
          // Fallback: If sharp fails, do NOT send clear image. Send 500.
          if (!res.headersSent) res.status(500).end();
        }
      } else {
        stream.pipe(res);
      }
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

  async secureImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { path: filePath } = req.query;
      const userId = req.userId;

      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({ success: false, error: { message: 'Path is required' } });
      }

      // Normalize path to ensure it starts with /
      const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;

      // Basic security check: prevent directory traversal and ensure it's in uploads
      if (normalizedPath.includes('..') || !normalizedPath.startsWith('/uploads')) {
        return res.status(403).json({ success: false, error: { message: 'Invalid path' } });
      }

      // Resolve full path (remove leading slash for join with process.cwd())
      const resolvedPath = (await import('path')).join(process.cwd(), normalizedPath.substring(1));

      // Verify file exists
      const { existsSync, createReadStream } = await import('fs');
      if (!existsSync(resolvedPath)) {
        return res.status(404).json({ success: false, error: { message: 'File not found' } });
      }

      // Determine content type (fallback to jpeg)
      const ext = (await import('path')).extname(resolvedPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for authenticated user

      const stream = createReadStream(resolvedPath);
      stream.pipe(res);

    } catch (error) {
      return next(error);
    }
  }

  async getAgoraToken(req: Request, res: Response, next: NextFunction) {
    try {
      const { channelName, userId } = req.query;
      const userUid = parseInt(userId as string);

      if (!channelName || isNaN(userUid)) {
        return res.status(400).json({
          success: false,
          error: { message: 'channelName (string) and userId (number) are required' }
        });
      }

      const token = agoraService.generateRtcToken(
        channelName as string,
        userUid
      );

      return sendSuccess(res, {
        token,
        appId: agoraService.getAppId()
      }, 'Agora token generated successfully', 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const mediaController = new MediaController();
