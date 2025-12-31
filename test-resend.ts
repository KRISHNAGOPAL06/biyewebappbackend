import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: process.env.EMAIL_USER || 'krishnagopal7872@gmail.com', // fallback to help user test
};

console.log('--- Resend Configuration Test ---');
console.log('API Key:', config.apiKey ? '*** (Set) ***' : '(Not Set)');
console.log('From:', config.from);
console.log('To:', config.to);
console.log('---------------------------------');

if (!config.apiKey) {
    console.error('❌ Error: RESEND_API_KEY not found in environment.');
    process.exit(1);
}

const resend = new Resend(config.apiKey);

console.log('Attempting to send test email via Resend API...');

resend.emails.send({
    from: config.from,
    to: config.to,
    subject: 'Resend Test Email - Biye',
    html: '<strong>Success!</strong> Your Biye app is now configured to send emails via Resend.',
}).then(({ data, error }) => {
    if (error) {
        console.error('❌ Resend API Error!');
        console.error('Details:', error.message);
    } else {
        console.log('✅ Test email sent through Resend!');
        console.log('Message ID:', data?.id);
        console.log('\n💡 Tip: If you used "onboarding@resend.dev", the email can ONLY be sent to your own email address.');
    }
}).catch((err) => {
    console.error('❌ Unexpected Error:', err.message);
});
