import { Resend } from 'resend';
import { logger } from '../../utils/logger.js';

const resend = new Resend(process.env.RESEND_API_KEY);

export class ResendEmailService {
    async sendOTP(email: string, otp: string, type: 'register' | 'login'): Promise<void> {
        logger.info(`[ResendEmailService] Sending OTP to ${email}`, {
            type,
            otpLength: otp.length,
        });

        if (process.env.NODE_ENV === 'development') {
            logger.debug(`[ResendEmailService] OTP for ${email}: ${otp}`);
        }

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

        try {
            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Biye <onboarding@resend.dev>',
                to: email,
                subject: 'Your Biye OTP Code',
                html,
            });

            if (error) {
                logger.error(`[ResendEmailService] Resend API error:`, {
                    error,
                    errorMessage: error.message,
                    errorName: error.name,
                    fullError: JSON.stringify(error)
                });
                throw new Error(`Failed to send OTP email: ${error.message}`);
            }

            logger.info(`[ResendEmailService] OTP email sent successfully to ${email}`, { messageId: data?.id });
        } catch (error: any) {
            logger.error(`[ResendEmailService] Exception while sending OTP:`, {
                error: error.message,
                stack: error.stack,
                fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
            });
            throw new Error('Failed to send OTP email');
        }
    }

    async sendWelcomeEmail(email: string, fullName?: string): Promise<void> {
        logger.info(`[ResendEmailService] Sending welcome email to ${email}`, {
            fullName,
        });

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

        try {
            const { data, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Biye <onboarding@resend.dev>',
                to: email,
                subject: 'Welcome to Biye!',
                html,
            });

            if (error) {
                logger.error(`[ResendEmailService] Failed to send welcome email to ${email}`, { error });
                return;
            }

            logger.info(`[ResendEmailService] Welcome email sent successfully to ${email}`, { messageId: data?.id });
        } catch (error) {
            logger.error(`[ResendEmailService] Failed to send welcome email to ${email}`, { error });
        }
    }

    async sendCandidateInvite(
        email: string,
        data: { parentName: string; profileId: string }
    ): Promise<void> {
        logger.info(`[ResendEmailService] Sending candidate invite to ${email}`, {
            parentName: data.parentName,
            profileId: data.profileId,
        });

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

        try {
            const { data: emailData, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Biye <onboarding@resend.dev>',
                to: email,
                subject: `${data.parentName} has created a profile for you on Biye`,
                html,
            });

            if (error) {
                logger.error(`[ResendEmailService] Failed to send candidate invite to ${email}`, { error });
                throw new Error(`Failed to send candidate invite email: ${error.message}`);
            }

            logger.info(`[ResendEmailService] Candidate invite sent successfully to ${email}`, { messageId: emailData?.id });
        } catch (error: any) {
            logger.error(`[ResendEmailService] Failed to send candidate invite to ${email}`, { error });
            throw new Error('Failed to send candidate invite email');
        }
    }

    async sendGuardianInvite(
        email: string,
        data: { inviterName: string; relationship: string }
    ): Promise<void> {
        logger.info(`[ResendEmailService] Sending guardian invite to ${email}`, {
            inviterName: data.inviterName,
            relationship: data.relationship,
        });

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

        try {
            const { data: emailData, error } = await resend.emails.send({
                from: process.env.EMAIL_FROM || 'Biye <onboarding@resend.dev>',
                to: email,
                subject: `${data.inviterName} has invited you to Biye`,
                html,
            });

            if (error) {
                logger.error(`[ResendEmailService] Failed to send guardian invite to ${email}`, { error });
                throw new Error(`Failed to send guardian invite email: ${error.message}`);
            }

            logger.info(`[ResendEmailService] Guardian invite sent successfully to ${email}`, { messageId: emailData?.id });
        } catch (error: any) {
            logger.error(`[ResendEmailService] Failed to send guardian invite to ${email}`, { error });
            throw new Error('Failed to send guardian invite email');
        }
    }
}

export const resendEmailService = new ResendEmailService();
