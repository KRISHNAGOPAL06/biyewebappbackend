// import {
//   GatewayPaymentRequest,
//   GatewayPaymentResponse,
//   WebhookVerificationResult,
//   GatewayWebhookPayload,
// } from '../payment.types.js';
// import { logger } from '../../../utils/logger.js';

// export class BkashGateway {
//   private appKey: string;
//   private appSecret: string;
//   private username: string;
//   private password: string;
//   private baseUrl: string;

//   constructor() {
//     this.appKey = process.env.BKASH_APP_KEY || '';
//     this.appSecret = process.env.BKASH_APP_SECRET || '';
//     this.username = process.env.BKASH_USERNAME || '';
//     this.password = process.env.BKASH_PASSWORD || '';
//     this.baseUrl = process.env.BKASH_SANDBOX === 'true'
//       ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
//       : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
//   }

//   async initiatePayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
//     try {
//       logger.info('bKash: Initiating payment', {
//         paymentId: request.paymentId,
//         amount: request.amount,
//       });

//       const createPaymentData = {
//         mode: '0011',
//         payerReference: request.profileId,
//         callbackURL: request.successUrl,
//         amount: request.amount.toString(),
//         currency: 'BDT',
//         intent: 'sale',
//         merchantInvoiceNumber: request.paymentId,
//       };

//       const paymentId = `bk_${Date.now()}_${request.paymentId.slice(0, 8)}`;
//       const paymentUrl = `${this.baseUrl}/checkout/payment/create?paymentID=${paymentId}`;

//       return {
//         success: true,
//         paymentUrl,
//         gatewayTxnId: paymentId,
//         rawResponse: { stub: true, createPaymentData },
//       };
//     } catch (error) {
//       logger.error('bKash: Payment initiation failed', { error, request });
//       return {
//         success: false,
//         error: 'Failed to initiate bKash payment',
//         rawResponse: { error: String(error) },
//       };
//     }
//   }

//   verifyWebhook(payload: Record<string, any>, signature?: string): WebhookVerificationResult {
//     try {
//       logger.info('bKash: Verifying webhook', { paymentID: payload.paymentID });

//       const webhookPayload: GatewayWebhookPayload = {
//         gatewayTxnId: payload.trxID || payload.paymentID,
//         status: payload.transactionStatus === 'Completed' ? 'success' : 'failed',
//         amount: parseFloat(payload.amount || '0'),
//         currency: 'BDT',
//         rawPayload: payload,
//       };

//       return { valid: true, payload: webhookPayload };
//     } catch (error) {
//       logger.error('bKash: Webhook verification failed', { error });
//       return { valid: false, error: 'Webhook verification failed' };
//     }
//   }

//   async executePayment(paymentId: string): Promise<{ success: boolean; trxId?: string }> {
//     logger.info('bKash: Executing payment', { paymentId });
//     return { success: true, trxId: `trx_${paymentId}` };
//   }

//   async queryPayment(paymentId: string): Promise<{ status: string; trxId?: string }> {
//     logger.info('bKash: Querying payment', { paymentId });
//     return { status: 'Completed', trxId: `trx_${paymentId}` };
//   }

//   private async getToken(): Promise<string> {
//     return 'stub_token';
//   }

//   private async refreshToken(token: string): Promise<string> {
//     return 'refreshed_stub_token';
//   }
// }

// export const bkashGateway = new BkashGateway();


import axios from 'axios';
import {
  GatewayPaymentRequest,
  GatewayPaymentResponse,
  WebhookVerificationResult,
  GatewayWebhookPayload,
} from '../payment.types.js';
import { logger } from '../../../utils/logger.js';

export class BkashGateway {
  private appKey: string;
  private appSecret: string;
  private username: string;
  private password: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.appKey = process.env.BKASH_APP_KEY || '';
    this.appSecret = process.env.BKASH_APP_SECRET || '';
    this.username = process.env.BKASH_USERNAME || '';
    this.password = process.env.BKASH_PASSWORD || '';
    this.baseUrl = process.env.BKASH_SANDBOX === 'true'
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
  }

  async initiatePayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResponse> {
    try {
      logger.info('bKash: Initiating payment', {
        paymentId: request.paymentId,
        amount: request.amount,
      });

      // bKash only supports BDT
      if (request.currency !== 'BDT') {
        return {
          success: false,
          error: 'bKash only supports BDT currency',
          rawResponse: { error: 'Currency not supported' },
        };
      }

      await this.ensureToken();

      const createPaymentData = {
        mode: '0011',
        payerReference: request.profileId,
        callbackURL: request.successUrl,
        amount: request.amount.toFixed(2),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: request.paymentId,
      };

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/create`,
        createPaymentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.accessToken!,
            'X-APP-Key': this.appKey,
          },
        }
      );

      if (response.data.statusCode === '0000') {
        return {
          success: true,
          paymentUrl: response.data.bkashURL,
          gatewayTxnId: response.data.paymentID,
          rawResponse: response.data,
        };
      } else {
        return {
          success: false,
          error: response.data.statusMessage || 'bKash payment initiation failed',
          rawResponse: response.data,
        };
      }
    } catch (error: any) {
      logger.error('bKash: Payment initiation failed', {
        error: error.message,
        request
      });
      return {
        success: false,
        error: `Failed to initiate bKash payment: ${error.message}`,
        rawResponse: { error: error.message },
      };
    }
  }

  verifyWebhook(payload: Record<string, any>): WebhookVerificationResult {
    try {
      logger.info('bKash: Verifying webhook', {
        paymentID: payload.paymentID,
        transactionStatus: payload.transactionStatus
      });

      const webhookPayload: GatewayWebhookPayload = {
        gatewayTxnId: payload.trxID || payload.paymentID,
        status: payload.transactionStatus === 'Completed' ? 'success' : 'failed',
        amount: parseFloat(payload.amount || '0'),
        currency: 'BDT',
        rawPayload: payload,
      };

      return { valid: true, payload: webhookPayload };
    } catch (error: any) {
      logger.error('bKash: Webhook verification failed', {
        error: error.message
      });
      return { valid: false, error: 'Webhook verification failed' };
    }
  }

  async executePayment(paymentId: string): Promise<{ success: boolean; trxId?: string }> {
    try {
      await this.ensureToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/execute`,
        { paymentID: paymentId },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.accessToken!,
            'X-APP-Key': this.appKey,
          },
        }
      );

      return {
        success: response.data.statusCode === '0000',
        trxId: response.data.trxID,
      };
    } catch (error: any) {
      logger.error('bKash: Execute payment failed', {
        error: error.message,
        paymentId
      });
      return { success: false };
    }
  }

  async queryPayment(paymentId: string): Promise<{ status: string; trxId?: string }> {
    try {
      await this.ensureToken();

      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/payment/status`,
        { paymentID: paymentId },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: this.accessToken!,
            'X-APP-Key': this.appKey,
          },
        }
      );

      return {
        status: response.data.transactionStatus,
        trxId: response.data.trxID,
      };
    } catch (error: any) {
      logger.error('bKash: Query payment failed', {
        error: error.message,
        paymentId
      });
      return { status: 'ERROR' };
    }
  }

  private async getToken(): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/tokenized/checkout/token/grant`,
        {
          app_key: this.appKey,
          app_secret: this.appSecret,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            username: this.username,
            password: this.password,
          },
        }
      );

      if (response.data.statusCode === '0000') {
        return response.data.id_token;
      } else {
        throw new Error(response.data.statusMessage);
      }
    } catch (error: any) {
      logger.error('bKash: Get token failed', { error: error.message });
      throw error;
    }
  }

  private async ensureToken(): Promise<void> {
    const now = Date.now();

    if (!this.accessToken || now >= this.tokenExpiry) {
      this.accessToken = await this.getToken();
      this.tokenExpiry = now + 3500000; // Token expires in ~58 minutes
    }
  }
}

export const bkashGateway = new BkashGateway();