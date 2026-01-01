import nodemailer from 'nodemailer';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 465, // Default to 465 (SSL) which is more reliable
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  from: process.env.EMAIL_FROM || '"Biye Support" <noreply@biye.com>',
};

// Create reusable transporter object using the default SMTP transport
export const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.port === 465, // true for 465, false for other ports
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
  // Add timeouts to prevent hanging
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,
  socketTimeout: 20000,
});

// Verify connection configuration
export const verifySmtpConnection = async (): Promise<boolean> => {
  try {
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      logger.warn('[EmailConfig] SMTP credentials missing');
      return false;
    }
    await transporter.verify();
    logger.info('[EmailConfig] SMTP Server ready');
    return true;
  } catch (error) {
    logger.error('[EmailConfig] SMTP Connection failed', error);
    return false;
  }
};
