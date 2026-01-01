import { env } from './env.js';

export const emailConfig = {
  brevoApiKey: process.env.BREVO_API_KEY,
  sender: {
    name: 'Biye Support',
    email: process.env.EMAIL_FROM_ADDRESS || 'biye.backend@gmail.com', // Must be verified in Brevo
  },
  url: 'https://api.brevo.com/v3/smtp/email',
};
