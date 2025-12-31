import { Request, Response } from 'express';
import { deviceTokenService } from './deviceToken.service.js';
import { sendError, sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

const SaveDeviceTokenSchema = z.object({
  token: z.string().min(1, 'FCM token is required'),
});

type SaveDeviceTokenRequest = z.infer<typeof SaveDeviceTokenSchema>;

class DeviceTokenController {
  /**
   * POST /api/v1/notifications/device-token
   * Save FCM device token for the authenticated user
   */
  async saveDeviceToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      // Validate request body
      const validation = SaveDeviceTokenSchema.safeParse(req.body);
      if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;

        sendError(
          res,
          'Invalid request body',
          400,
          JSON.stringify({ errors }),
        );
        return;

      }

      const { token } = validation.data as SaveDeviceTokenRequest;

      // Save device token
      const deviceToken = await deviceTokenService.saveDeviceToken(userId, token);
      sendSuccess(res, {
        id: deviceToken.id,
        userId: deviceToken.userId,
        token: deviceToken.token,
      }, 'Device token saved successfully', 200);

      // sendSuccess(res, 200, 'Device token saved successfully', {
      //   id: deviceToken.id,
      //   userId: deviceToken.userId,
      //   token: deviceToken.token,
      // });
    } catch (error) {
      logger.error('Failed to save device token', {
        userId: (req as any).userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      sendError(res, 'Failed to save device token', 500);
    }
  }

  /**
   * DELETE /api/v1/notifications/device-token/:token
   * Delete a specific device token
   */
  async deleteDeviceToken(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).userId;
      if (!userId) {
        sendError(res, 'Unauthorized', 401);
        return;
      }

      const { token } = req.params;
      if (!token) {
        sendError(res, 'Token parameter is required', 400);
        return;
      }

      const deleted = await deviceTokenService.deleteDeviceToken(token);
      if (!deleted) {
        sendError(res, 'Device token not found', 404);
        return;
      }

      // sendResponse(res, 200, 'Device token deleted successfully', {
      //   message: 'Device token deleted',
      // });
      sendSuccess(res, 'Device token deleted successfully', 'Device token deleted', 200);
    } catch (error) {
      logger.error('Failed to delete device token', {
        userId: (req as any).userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      sendError(res, 'Failed to delete device token', 500);
    }
  }
}

export const deviceTokenController = new DeviceTokenController();
