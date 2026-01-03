import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service.js';
import { VerifyOTPDTO, LoginDTO, SelfRegistrationDTO, ParentRegistrationDTO, CandidateStartDTO, InviteChildDTO } from './auth.dto.js';
import { SessionInfo } from './auth.types.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class AuthController {
  async googleAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionInfo: SessionInfo = {
        deviceId: req.headers['x-device-id'] as string,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await authService.googleAuth(req.body, sessionInfo);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return sendSuccess(res, result, 'Google login successful', 200);
    } catch (err) {
      next(err);
      return; // ✅ ensures a return value
    }
  }

  async completeGoogleOnboarding(req: Request, res: Response) {
    const userId = req.userId; // from authenticateToken
    const dto = req.body;

    if (!userId) {
      throw new Error('Unauthorized');
    }

    const result = await authService.completeGoogleOnboarding(userId, dto);

    res.status(200).json(result);
  }

  async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = req.body;

      // Detect registration flow based on creatingFor
      if (body.creatingFor === 'self') {
        const dto: SelfRegistrationDTO = body;
        const result = await authService.registerSelf(dto);
        return sendSuccess(res, result, result.message, 201);
      } else {
        const dto: ParentRegistrationDTO = body;
        const result = await authService.registerParent(dto);
        return sendSuccess(res, result, result.message, 201);
      }
    } catch (error) {
      return next(error);
    }
  }

  async verify(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: VerifyOTPDTO = req.body;

      const sessionInfo: SessionInfo = {
        deviceId: req.headers['x-device-id'] as string,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip,
        userAgent: req.headers['user-agent'],
      };

      const result = await authService.verify(dto, sessionInfo);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return sendSuccess(res, result, 'Verification successful', 200);
    } catch (error) {
      return next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: LoginDTO = req.body;

      const result = await authService.login(dto);

      return sendSuccess(res, result, 'OTP sent to your email. Please verify to login.', 200);
    } catch (error) {
      return next(error);
    }
  }


  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        return sendError(res, 'Refresh token not found', 401, 'REFRESH_TOKEN_MISSING');
      }

      const result = await authService.refresh(refreshToken);

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return sendSuccess(res, result, 'Token refreshed successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refreshToken;
      const sessionId = (req as any).sessionId;

      if (!refreshToken || !sessionId) {
        throw new Error('Invalid logout request');
      }

      await authService.logout(refreshToken, sessionId);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      return sendSuccess(res, null, 'Logged out successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;

      if (!userId) {
        throw new Error('Unauthorized');
      }

      const user = await authService.getMe(userId);

      return sendSuccess(res, user, 'User retrieved successfully', 200);
    } catch (error) {
      return next(error);
    }
  }

  async candidateStart(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CandidateStartDTO = req.body;

      const result = await authService.candidateStart(dto);

      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      return next(error);
    }
  }

  async guardianStart(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CandidateStartDTO = req.body;

      const result = await authService.guardianStart(dto);

      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      return next(error);
    }
  }

  async inviteChild(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: InviteChildDTO = req.body;
      const userId = (req as any).userId;

      if (!userId) {
        throw new Error('Unauthorized');
      }

      const result = await authService.inviteChild(dto, userId);

      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      return next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      return next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body;
      const result = await authService.resetPassword(dto);
      return sendSuccess(res, result, result.message, 200);
    } catch (error) {
      return next(error);
    }
  }
}

export const authController = new AuthController();
