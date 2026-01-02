import {
  // PaymentStatus,
  PaymentGateway,
  CheckoutRequest,
  CheckoutResponse,
  PaymentResponse,
  GatewayPaymentRequest,
} from './payment.types.js';
import { planService } from './plan.service.js';
import { subscriptionService } from './subscription.service.js';
import { sslcommerzGateway } from './gateways/sslcommerz.gateway.js';
import { stripeGateway } from './gateways/stripe.gateway.js';
import { bkashGateway } from './gateways/bkash.gateway.js';
import { applepayGateway } from './gateways/applepay.gateway.js';
import { eventBus } from '../../events/eventBus.js';
import { logger } from '../../utils/logger.js';
import { currencyService } from './currency.service.js';

import { prisma } from '../../prisma.js';

export class PaymentService {
  async initiateCheckout(
    request: CheckoutRequest,
    userId: string,
    requestIp?: string
  ): Promise<CheckoutResponse> {
    const { profileId, planCode, gateway, currency: requestedCurrency, couponCode } = request;
    logger.info(`[Payment] Initiating checkout for plan: ${planCode}, user: ${userId}, profile: ${profileId}`);

    // Get user's detected currency
    // const requestIp = req?.ip || req?.socket?.remoteAddress;
    const currencyResult = await currencyService.detectCurrency(profileId, requestIp);

    // Use requested currency if provided, otherwise detected currency
    const currency = requestedCurrency || currencyResult.currency;

    // Check for potential cheating
    if (!currencyResult.allSourcesMatch) {
      logger.warn('Currency mismatch detected', {
        profileId,
        currencyResult,
        requestedCurrency,
      });
    }

    const plan = await planService.getPlanByCode(planCode);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Start with plan price
    let amount = plan.price;
    let planDiscount = 0;
    let couponDiscount = 0;

    // Step 1: Apply plan's built-in discount (discountAmount takes priority over discountPercent)
    if (plan.discountAmount && plan.discountAmount > 0) {
      planDiscount = plan.discountAmount;
    } else if (plan.discountPercent && plan.discountPercent > 0) {
      planDiscount = Math.round(amount * (plan.discountPercent / 100));
    }
    amount = Math.max(0, amount - planDiscount);

    if (planDiscount > 0) {
      logger.info('Plan discount applied', { planCode, planDiscount, priceAfterPlanDiscount: amount });
    }

    // Step 2: Apply coupon discount if provided
    if (couponCode) {
      const couponResult = await planService.validateCoupon(couponCode);
      if (couponResult.valid) {
        // Apply discount - use discountAmount first, then calculate from percent
        if (couponResult.discountAmount && couponResult.discountAmount > 0) {
          couponDiscount = couponResult.discountAmount;
        } else if (couponResult.discountPercent && couponResult.discountPercent > 0) {
          couponDiscount = Math.round(amount * (couponResult.discountPercent / 100));
        }
        amount = Math.max(0, amount - couponDiscount);
        logger.info('Coupon applied', { couponCode, couponDiscount, finalAmount: amount });
      } else {
        logger.warn('Invalid coupon code provided', { couponCode });
      }
    }

    const totalDiscount = planDiscount + couponDiscount;

    // Convert amount based on currency if needed
    if (currency !== 'BDT') {
      // Implement currency conversion logic here
      amount = await this.convertCurrency(amount, 'BDT', currency);
    }

    const validation = await planService.validatePlanAccess(planCode, false);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const payment = await prisma.payment.create({
      data: {
        profileId,
        gateway,
        amount,
        currency,
        status: 'initiated',
      },
    });


    logger.info('Payment initiated', {
      paymentId: payment.id,
      profileId,
      planCode,
      gateway,
      amount,
      planDiscount,
      couponDiscount,
      totalDiscount,
    });

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5000';
    const gatewayRequest: GatewayPaymentRequest = {
      paymentId: payment.id,
      amount,
      currency, // Use detected currency
      profileId,
      planCode: plan.code,
      planName: plan.name,
      successUrl: `${baseUrl}/api/v1/payments/callback/success`,
      failUrl: `${baseUrl}/api/v1/payments/callback/fail`,
      cancelUrl: `${baseUrl}/api/v1/payments/callback/cancel`,
      currencyInfo: {
        code: currency,
        symbol: this.getCurrencySymbol(currency),
        countryCode: currencyResult.countryCode,
      },
    };

    const gatewayResponse = await this.processGatewayRequest(gateway, gatewayRequest);

    if (!gatewayResponse.success) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          rawResponse: gatewayResponse.rawResponse || {},
        },
      });
      throw new Error(gatewayResponse.error || 'Payment gateway error');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        gatewayTxnId: gatewayResponse.gatewayTxnId,
        rawResponse: {
          ...(gatewayResponse.rawResponse || {}),
          planCode: plan.code, // Persist plan code for fallback
        },
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: gatewayResponse.paymentUrl!,
      gateway,
    };
  }

  async handlePaymentSuccess(
    paymentId: string,
    gatewayTxnId: string,
    rawResponse: Record<string, any>
  ): Promise<void> {
    console.log(`[Payment] Handling success for ${paymentId}, txn: ${gatewayTxnId}`);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status === 'success') {
      logger.warn('Payment already processed', { paymentId });
      return;
    }

    let plan = await this.getPlanFromPaymentContext(rawResponse, payment);

    // Fallback: If plan not found locally, try fetching from Stripe directly if we have a session ID
    if (!plan && rawResponse.session_id && payment.gateway === 'stripe') {
      const stripeVerification = await stripeGateway.verifyPayment(rawResponse.session_id);
      if (stripeVerification.success && stripeVerification.metadata?.planCode) {
        logger.info('Recovered plan from Stripe direct verification', { planCode: stripeVerification.metadata.planCode });
        plan = await planService.getPlanByCode(stripeVerification.metadata.planCode);
      }
    }

    if (!plan) {
      console.error(`[Payment] Plan resolution failed for ${paymentId}. Raw:`, rawResponse, "Stored:", payment.rawResponse);
      throw new Error('Could not determine plan for payment - Metadata missing');
    }

    const profile = await prisma.profile.findUnique({
      where: { id: payment.profileId },
      select: { userId: true },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    const subscription = await subscriptionService.createSubscription(
      payment.profileId,
      plan.id,
      profile.userId
    );

    // Merge new callback data with existing stored data to preserve planCode/metadata
    const updatedRawResponse = {
      ...(payment.rawResponse as Record<string, any>),
      ...rawResponse,
      processedAt: new Date().toISOString()
    };

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'success',
        subscriptionId: subscription.id,
        gatewayTxnId,
        rawResponse: updatedRawResponse,
      },
    });

    logger.info('Payment successful', {
      paymentId,
      subscriptionId: subscription.id,
      profileId: payment.profileId,
      planCode: plan.code
    });
  }

  async handlePaymentFailure(
    paymentId: string,
    rawResponse: Record<string, any>
  ): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'failed',
        rawResponse: {
          ...(payment.rawResponse as Record<string, any>),
          ...rawResponse
        },
      },
    });

    const profile = await prisma.profile.findUnique({
      where: { id: payment.profileId },
      select: { userId: true },
    });

    if (profile) {
      eventBus.emitNotification({
        userId: profile.userId,
        type: 'payment_failed',
        metadata: {
          paymentId,
          gateway: payment.gateway,
          amount: payment.amount,
        },
        priority: 'HIGH',
      });
    }

    logger.warn('Payment failed', { paymentId, profileId: payment.profileId });
  }

  async getPaymentById(paymentId: string): Promise<PaymentResponse | null> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) return null;

    return this.formatPaymentResponse(payment);
  }

  async getPaymentHistory(profileId: string): Promise<PaymentResponse[]> {
    const payments = await prisma.payment.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
    });

    return payments.map((p) => this.formatPaymentResponse(p));
  }

  async refundPayment(paymentId: string): Promise<PaymentResponse> {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'success') {
      throw new Error('Only successful payments can be refunded');
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'refunded' },
    });

    if (payment.subscriptionId) {
      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'cancelled' },
      });
    }

    logger.info('Payment refunded', { paymentId, subscriptionId: payment.subscriptionId });

    return this.formatPaymentResponse(updated);
  }

  // private async validateProfileAccess(profileId: string, userId: string): Promise<boolean> {
  //   const profile = await prisma.profile.findFirst({
  //     where: { id: profileId, userId },
  //   });

  //   if (profile) return true;

  //   const candidateLink = await prisma.candidateLink.findFirst({
  //     where: {
  //       profileId,
  //       parentUserId: userId,
  //       status: 'active',
  //     },
  //   });

  //   return !!candidateLink;
  // }

  private async processGatewayRequest(
    gateway: PaymentGateway,
    request: GatewayPaymentRequest
  ) {
    switch (gateway) {
      case 'sslcommerz':
        return sslcommerzGateway.initiatePayment(request);
      case 'stripe':
        return stripeGateway.initiatePayment(request);
      case 'bkash':
        return bkashGateway.initiatePayment(request);
      case 'applepay':
        return applepayGateway.initiatePayment(request);
      default:
        throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
  }

  private async getPlanFromPaymentContext(rawResponse: any, storedPayment?: any) {
    // Priority 1: Direct planCode in callback (e.g. SSLCommerz value_b)
    if (rawResponse?.value_b) {
      return planService.getPlanByCode(rawResponse.value_b);
    }

    // Priority 2: Stored payment record
    const storedResponse = storedPayment?.rawResponse as any;

    // Check direct planCode property
    if (storedResponse?.planCode) {
      return planService.getPlanByCode(storedResponse.planCode);
    }

    // Check metadata (Stripe style)
    if (storedResponse?.metadata?.planCode) {
      return planService.getPlanByCode(storedResponse.metadata.planCode);
    }

    // Check nested rawResponse (if wrapped)
    if (storedResponse?.rawResponse?.planCode) {
      return planService.getPlanByCode(storedResponse.rawResponse.planCode);
    }

    console.warn("DEBUG: Failed to determine plan. Input rawResponse keys:", Object.keys(rawResponse || {}), "Stored rawResponse:", storedResponse);

    return null;
  }

  private formatPaymentResponse(payment: any): PaymentResponse {
    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      profileId: payment.profileId,
      gateway: payment.gateway,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      gatewayTxnId: payment.gatewayTxnId,
      createdAt: payment.createdAt,
    };
  }

  private async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    if (fromCurrency === toCurrency) return amount;

    // Implement currency conversion API call
    // For now, return a fixed conversion (you should use a real API)
    const conversionRates: Record<string, number> = {
      USD: 0.0091, // 1 BDT = 0.0091 USD
      EUR: 0.0084,
      GBP: 0.0072,
      INR: 0.76,
    };

    const rate = conversionRates[toCurrency] || 1;
    return Math.round(amount * rate * 100) / 100; // Round to 2 decimal places
  }

  private getCurrencySymbol(currency: string): string {
    const symbols: Record<string, string> = {
      BDT: '৳',
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
    };

    return symbols[currency] || currency;
  }
}

export const paymentService = new PaymentService();
