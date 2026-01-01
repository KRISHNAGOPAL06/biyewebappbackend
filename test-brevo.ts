import axios from 'axios';
import dotenv from 'dotenv';
import { emailConfig } from './src/config/email.js';

dotenv.config();

// Override with env if not picked up by config
const apiKey = process.env.BREVO_API_KEY;
const senderEmail = process.env.EMAIL_FROM_ADDRESS || 'biye.backend@gmail.com';

console.log('--- Brevo API Email Test ---');
console.log('API Key Present:', !!apiKey);
console.log('Sender Email:', senderEmail);
console.log('---------------------------');

if (!apiKey) {
    console.error('❌ Error: BREVO_API_KEY not found in environment.');
    console.error('Please add it to your .env file.');
    process.exit(1);
}

const sendTestEmail = async () => {
    try {
        console.log('Sending test email via Brevo HTTP API...');

        const response = await axios.post(
            'https://api.brevo.com/v3/smtp/email',
            {
                sender: { name: 'Biye Test', email: senderEmail },
                to: [{ email: process.env.EMAIL_USER || senderEmail }], // Send to yourself
                subject: 'Brevo API Test - Biye Backend',
                htmlContent: '<html><body><h1>It Works!</h1><p>This email was sent using the Brevo HTTP API (Port 443).</p></body></html>',
            },
            {
                headers: {
                    'api-key': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout: 10000,
            }
        );

        console.log('✅ Email Sent Successfully!');
        console.log('Message ID:', response.data.messageId);
        console.log('Response Status:', response.status);
    } catch (error: any) {
        console.error('❌ Failed to send email.');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
};

sendTestEmail();
