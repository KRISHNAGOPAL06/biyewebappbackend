import { Request, Response, NextFunction } from 'express';
import { planService } from './plan.service.js';
import { subscriptionService } from './subscription.service.js';
import { env } from '../../config/env.js';
import { paymentService } from './payment.service.js';
import { entitlementService } from './entitlement.service.js';
import { CheckoutDTO, PauseSubscriptionDTO } from './payment.dto.js';
import { sendSuccess, sendError } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../prisma.js';

export class PaymentController {
  async getPlans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeInvite = req.query.includeInvite === 'true';
      const plans = await planService.getAllPlans(includeInvite);

      res.json(sendSuccess(res, plans, 'Plans retrieved successfully', 200));

    } catch (error) {
      next(error);
    }
  }

  async getPlanByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.params;
      const plan = await planService.getPlanByCode(code);

      if (!plan) {
        sendError(res, 'Plan not found', 404);
        // res.status(404).json(sendError(res, 'Unauthorized', 401);errorResponse('Plan not found', 'NOT_FOUND'));
        return;
      }

      res.json(sendSuccess(res, plan, 'Plans retrieved successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async validateCoupon(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { couponCode } = req.body;

      const result = await planService.validateCoupon(couponCode);

      if (!result.valid) {
        sendError(res, result.error || 'Invalid coupon code', 400);
        return;
      }

      res.json(sendSuccess(res, {
        valid: true,
        discountAmount: result.discountAmount,
        discountPercent: result.discountPercent,
        planCode: result.planCode,
      }, 'Coupon validated successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  // async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
  //   try {
  //     const userId = req.userId!;
  //     const dto: CheckoutDTO = req.body;

  //     const requestIp = this.extractClientIp(req);
  //     // console.log(req)
  //     console.log(requestIp)


  //     const result = await paymentService.initiateCheckout(dto, userId, requestIp);

  //     res.json(sendSuccess(res, result, 'Checkout initiated successfully', 200));
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  async checkout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;
      const dto: CheckoutDTO = req.body;

      logger.info('Checkout request received', {
        userId,
        profileId: dto.profileId,
        planCode: dto.planCode,
        gateway: dto.gateway,
        currency: dto.currency,
        couponCode: dto.couponCode,
      });

      const requestIp = this.extractClientIp(req);

      const result = await paymentService.initiateCheckout(dto, userId, requestIp);

      if (res.headersSent) return;

      res.status(200).json(
        sendSuccess(res, result, 'Checkout initiated successfully', 200)
      );
    } catch (error: any) {
      logger.error('Checkout failed', {
        error: error.message,
        stack: error.stack,
        body: req.body,
      });
      if (!res.headersSent) {
        // Return 400 for checkout failures to give feedback to frontend
        sendError(res, error.message || 'Checkout failed', 400);
      }
    }
  }

  // private extractClientIp(req: Request): string {
  //   // Get IP from various headers (for proxy/load balancer setups)
  //   const forwarded = req.headers['x-forwarded-for'];
  //   if (forwarded) {
  //     console.log("forwarded: TRUE")
  //     return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  //   }
  //   // console.log("Req Ip: " + req.ip)


  //   // Get from socket
  //   const socketIp = req.socket?.remoteAddress;
  //   // console.log("socketIp: " + socketIp)

  //   if (socketIp) {
  //     return socketIp;
  //   }

  //   // Fallback
  //   // console.log("Req Ip: " + req.ip)

  //   return req.ip || '127.0.0.1';
  // }


  private extractClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }

    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }

    if (req.socket?.remoteAddress) {
      return req.socket.remoteAddress;
    }

    return req.ip || '127.0.0.1';
  }

  async getMyActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId!;

      // Get user's profile first
      const profile = await prisma.profile.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!profile) {
        res.json(sendSuccess(res, null, 'No profile found', 200));
        return;
      }

      const subscription = await subscriptionService.getActiveSubscription(profile.id);
      res.json(sendSuccess(res, subscription, 'Subscription retrieved successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async getActiveSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const subscription = await subscriptionService.getActiveSubscription(profileId);

      if (!subscription) {
        sendError(res, 'No active subscription found', 404);

        // res.status(404).json(errorResponse('No active subscription found', 'NOT_FOUND'));
        return;
      }

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      sendSuccess(res, subscription, 'Subscription retrieved successfully', 200);
    } catch (error) {
      next(error);
    }
  }

  async getSubscriptionHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const subscriptions = await subscriptionService.getSubscriptionHistory(profileId);

      res.json(sendSuccess(res, subscriptions, 'Subscription history retrieved successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async pauseSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const { pauseDays }: PauseSubscriptionDTO = req.body;
      const userId = req.userId!;

      const subscription = await subscriptionService.pauseSubscription(profileId, pauseDays, userId);

      res.json(sendSuccess(res, subscription, 'Subscription paused successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async resumeSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.userId!;

      const subscription = await subscriptionService.resumeSubscription(profileId, userId);

      res.json(sendSuccess(res, subscription, 'Subscription resumed successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async cancelSubscription(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const userId = req.userId!;

      const subscription = await subscriptionService.cancelSubscription(profileId, userId);

      res.json(sendSuccess(res, subscription, 'Subscription cancelled successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const payments = await paymentService.getPaymentHistory(profileId);

      res.json(sendSuccess(res, payments, 'Payment history retrieved successfully', 200));
    } catch (error) {
      next(error);
    }
  }

  async getUsageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;

      const [features, usage] = await Promise.all([
        entitlementService.getProfileFeatures(profileId),
        entitlementService.getUsageStats(profileId),
      ]);

      if (!features) {
        sendError(res, 'No active subscription found', 404);
        // res.status(404).json(errorResponse('No active subscription found', 'NOT_FOUND'));
        return;
      }

      res.json(
        sendSuccess(res,
          {
            features,
            usage,
          },
          'Usage stats retrieved successfully', 200
        )
      );
    } catch (error) {
      next(error);
    }
  }

  async checkEntitlement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { profileId } = req.params;
      const { action, context } = req.body;

      const canPerform = await entitlementService.can(profileId, action, context);

      res.json(
        sendSuccess(res,
          { allowed: canPerform, action },
          canPerform ? 'Action allowed' : 'Action not allowed', 200
        )
      );
    } catch (error) {
      next(error);
    }
  }

  // async handlePaymentCallback(req: Request, res: Response): Promise<void> {
  //   try {
  //     const { status } = req.params;
  //     const { paymentId, session_id, tran_id } = req.query;

  //     const resolvedPaymentId = (paymentId || tran_id || session_id) as string;

  //     if (!resolvedPaymentId) {
  //       res.redirect('/payment/error?reason=missing_id');
  //       return;
  //     }
  //     console.log("status: " + status)

  //     if (status === 'success') {
  //       await paymentService.handlePaymentSuccess(
  //         resolvedPaymentId,
  //         req.query.gatewayTxnId as string || '',
  //         req.query as Record<string, any>
  //       );
  //       res.redirect(`/payment/success?paymentId=${resolvedPaymentId}`);
  //     } else if (status === 'fail') {
  //       await paymentService.handlePaymentFailure(resolvedPaymentId, req.query as Record<string, any>);
  //       res.redirect(`/payment/failed?paymentId=${resolvedPaymentId}`);
  //     } else {
  //       res.redirect(`/payment/cancelled?paymentId=${resolvedPaymentId}`);
  //     }
  //   } catch (error) {
  //     logger.error('Payment callback error', { error });
  //     res.redirect('/payment/error');
  //   }
  // }



  async handlePaymentCallback(req: Request, res: Response): Promise<void> {
    try {

      const { status } = req.params;
      const data = {
        ...req.query,
        ...req.body,
      };
      const { paymentId, tran_id, session_id } = data;
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';

      console.log(`[Payment] Callback resolved frontendUrl: ${frontendUrl}`);

      const resolvedPaymentId = paymentId || tran_id || session_id;

      if (!resolvedPaymentId) {
        console.error("Callback missing ID. Body:", req.body, "Query:", req.query);
        res.redirect(`${frontendUrl}/payment/error?reason=missing_transaction_id`);
        return;
      }

      if (status === 'success') {
        await paymentService.handlePaymentSuccess(
          resolvedPaymentId,
          tran_id || session_id || '',
          data
        );
        res.redirect(`${frontendUrl}/payment/success?paymentId=${resolvedPaymentId}`);
        return;
      }

      if (status === 'fail') {
        await paymentService.handlePaymentFailure(
          resolvedPaymentId,
          data
        );
        res.redirect(`${frontendUrl}/payment/failed?paymentId=${resolvedPaymentId}`);
        return;
      }

      res.redirect(`${frontendUrl}/payment/cancelled?paymentId=${resolvedPaymentId}`);
    } catch (err: any) {
      logger.error('Payment callback error:', err);
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:3000';
      // encodeURIComponent to ensure URL validity
      const errorMsg = err?.message || 'Payment processing failed';
      const msg = encodeURIComponent(errorMsg);
      res.redirect(`${frontendUrl}/payment/error?reason=${msg}`);
    }
  }
}

export const paymentController = new PaymentController();
