import axios from 'axios';
import { emailConfig } from '../../config/email.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';

export class EmailService {
  /**
   * Send email using Brevo HTTP API
   */
  async sendEmail(to: string, subject: string, html: string): Promise<void> {
    logger.info(`[EmailService] Sending email to ${to}`, { subject });

    if (!emailConfig.brevoApiKey) {
      if (env.NODE_ENV === 'development') {
        logger.warn('[EmailService] BREVO_API_KEY missing. Skipping email send (DEV MODE).');
        return;
      }
      logger.error('[EmailService] Cannot send email: BREVO_API_KEY missing');
      throw new Error('Email service not configured');
    }

    try {
      const response = await axios.post(
        emailConfig.url,
        {
          sender: emailConfig.sender,
          to: [{ email: to }],
          subject: subject,
          htmlContent: html,
        },
        {
          headers: {
            'api-key': emailConfig.brevoApiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 10000, // 10s timeout
        }
      );

      logger.info(`[EmailService] Email sent successfully to ${to}`, { messageId: response.data.messageId });
    } catch (error: any) {
      logger.error(`[EmailService] Failed to send email to ${to}`, {
        error: error.response?.data || error.message,
        status: error.response?.status,
        subject,
      });
      throw new Error('Failed to send email');
    }
  }

  async sendOTP(email: string, otp: string, type: 'register' | 'login'): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Biye OTP Code</h2>
        <p>Your OTP is <strong style="font-size: 24px; color: #4CAF50;">${otp}</strong></p>
        <p>This code is valid for <strong>5 minutes</strong>.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email from Biye. Please do not reply.</p>
      </div>
    `;

    return this.sendEmail(email, 'Your Biye OTP Code', html);
  }

  async sendWelcomeEmail(email: string, fullName?: string): Promise<void> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Biye!</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>Thank you for registering with Biye. Your account has been successfully verified.</p>
        <p>You can now log in and start exploring our platform.</p>
        <hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email from Biye. Please do not reply.</p>
      </div>
    `;

    return this.sendEmail(email, 'Welcome to Biye!', html);
  }

  async sendCandidateInvite(
    email: string,
    data: { parentName: string; profileId: string }
  ): Promise<void> {
    const inviteLink = `${process.env.FRONTEND_URL || 'https://biye.com'}/candidate/start?email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've Been Invited to Biye!</h2>
        <p>Hi there,</p>
        <p><strong>${data.parentName}</strong> has created a matrimonial profile for you on Biye.</p>
        <p>To claim your profile and set up your login, please click the link below:</p>
        <p style="margin: 20px 0;">
          <a href="${inviteLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Claim Your Profile
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${inviteLink}</p>
        <hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email from Biye. Please do not reply.</p>
      </div>
    `;

    return this.sendEmail(email, `${data.parentName} has created a profile for you on Biye`, html);
  }

  async sendGuardianInvite(
    email: string,
    data: { inviterName: string; relationship: string }
  ): Promise<void> {
    const inviteLink = `${process.env.FRONTEND_URL || 'https://biye.com'}/guardian/start?email=${encodeURIComponent(email)}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You've Been Invited to Help Manage a Profile on Biye!</h2>
        <p>Hi there,</p>
        <p><strong>${data.inviterName}</strong> has invited you to help manage a matrimonial profile on Biye as <strong>${data.relationship}</strong>.</p>
        <p>To accept the invitation and set up your login, please click the link below:</p>
        <p style="margin: 20px 0;">
          <a href="${inviteLink}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Accept Invitation
          </a>
        </p>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${inviteLink}</p>
        <hr style="margin-top: 20px; border: none; border-top: 1px solid #ddd;">
        <p style="color: #888; font-size: 12px;">This is an automated email from Biye. Please do not reply.</p>
      </div>
    `;

    return this.sendEmail(email, `${data.inviterName} has invited you to Biye`, html);
  }
}

export const emailService = new EmailService();
