import { Request, Response, NextFunction } from 'express';
import { sslcommerzGateway } from './gateways/sslcommerz.gateway.js';
import { stripeGateway } from './gateways/stripe.gateway.js';
import { bkashGateway } from './gateways/bkash.gateway.js';
import { applepayGateway } from './gateways/applepay.gateway.js';
import { paymentService } from './payment.service.js';
import { logger } from '../../utils/logger.js';

export class WebhookController {
  async handleSSLCommerz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('SSLCommerz webhook received', { body: req.body });

      const signature = req.headers['x-sslcommerz-signature'] as string;
      const result = sslcommerzGateway.verifyWebhook(req.body, signature);

      if (!result.valid || !result.payload) {
        logger.warn('SSLCommerz webhook verification failed', { error: result.error });
        res.status(400).json({ error: result.error });
        return;
      }

      const paymentId = req.body.tran_id;

      if (result.payload.status === 'success') {
        await paymentService.handlePaymentSuccess(
          paymentId,
          result.payload.gatewayTxnId,
          result.payload.rawPayload
        );
      } else {
        await paymentService.handlePaymentFailure(paymentId, result.payload.rawPayload);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('SSLCommerz webhook error', { error });
      next(error);
    }
  }

  // async handleStripe(req: Request, res: Response, next: NextFunction): Promise<void> {
  //   try {
  //     logger.info('Stripe webhook received', { type: req.body?.type });

  //     const signature = req.headers['stripe-signature'] as string;
  //     const result = stripeGateway.verifyWebhook(req.body, signature);

  //     if (!result.valid || !result.payload) {
  //       logger.warn('Stripe webhook verification failed', { error: result.error });
  //       res.status(400).json({ error: result.error });
  //       return;
  //     }

  //     const paymentId = req.body.data?.object?.metadata?.paymentId;

  //     if (!paymentId) {
  //       logger.warn('Stripe webhook missing paymentId in metadata');
  //       res.status(400).json({ error: 'Missing payment ID' });
  //       return;
  //     }

  //     if (result.payload.status === 'success') {
  //       await paymentService.handlePaymentSuccess(
  //         paymentId,
  //         result.payload.gatewayTxnId,
  //         result.payload.rawPayload
  //       );
  //     } else {
  //       await paymentService.handlePaymentFailure(paymentId, result.payload.rawPayload);
  //     }

  //     res.json({ received: true });
  //   } catch (error) {
  //     logger.error('Stripe webhook error', { error });
  //     next(error);
  //   }
  // }
  // Update handleStripe method
  async handleStripe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const result = stripeGateway.verifyWebhook(req.body, signature);

      if (!result.valid || !result.payload) {
        logger.warn('Stripe webhook verification failed', { error: result.error });
        res.status(400).json({ error: result.error });
        return;
      }

      // Extract paymentId from metadata
      const rawPayload = result.payload.rawPayload as any;
      const paymentId = rawPayload?.data?.object?.metadata?.paymentId;

      if (!paymentId) {
        logger.warn('Stripe webhook missing paymentId in metadata', {
          payload: rawPayload,
        });
        res.status(400).json({ error: 'Missing payment ID' });
        return;
      }

      if (result.payload.status === 'success') {
        await paymentService.handlePaymentSuccess(
          paymentId,
          result.payload.gatewayTxnId,
          rawPayload
        );
      } else {
        await paymentService.handlePaymentFailure(paymentId, rawPayload);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Stripe webhook error', { error });
      next(error);
    }
  }

  // Similarly update other webhook handlers

  async handleBkash(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('bKash webhook received', { body: req.body });

      const result = bkashGateway.verifyWebhook(req.body);

      if (!result.valid || !result.payload) {
        logger.warn('bKash webhook verification failed', { error: result.error });
        res.status(400).json({ error: result.error });
        return;
      }

      const paymentId = req.body.merchantInvoiceNumber;

      if (!paymentId) {
        logger.warn('bKash webhook missing merchantInvoiceNumber');
        res.status(400).json({ error: 'Missing payment ID' });
        return;
      }

      if (result.payload.status === 'success') {
        await paymentService.handlePaymentSuccess(
          paymentId,
          result.payload.gatewayTxnId,
          result.payload.rawPayload
        );
      } else {
        await paymentService.handlePaymentFailure(paymentId, result.payload.rawPayload);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('bKash webhook error', { error });
      next(error);
    }
  }

  async handleApplePay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Apple Pay webhook received', { type: req.body?.type });

      const signature = req.headers['stripe-signature'] as string;
      const result = applepayGateway.verifyWebhook(req.body, signature);

      if (!result.valid || !result.payload) {
        logger.warn('Apple Pay webhook verification failed', { error: result.error });
        res.status(400).json({ error: result.error });
        return;
      }

      const paymentId = req.body.data?.object?.metadata?.paymentId;

      if (!paymentId) {
        logger.warn('Apple Pay webhook missing paymentId in metadata');
        res.status(400).json({ error: 'Missing payment ID' });
        return;
      }

      if (result.payload.status === 'success') {
        await paymentService.handlePaymentSuccess(
          paymentId,
          result.payload.gatewayTxnId,
          result.payload.rawPayload
        );
      } else {
        await paymentService.handlePaymentFailure(paymentId, result.payload.rawPayload);
      }

      res.json({ received: true });
    } catch (error) {
      logger.error('Apple Pay webhook error', { error });
      next(error);
    }
  }

  async handleVisaMastercard(req: Request, res: Response, next: NextFunction): Promise<void> {
    return this.handleStripe(req, res, next);
  }
}

export const webhookController = new WebhookController();
