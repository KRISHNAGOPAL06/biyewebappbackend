import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || 'noreply@biye.com',
};

console.log('--- SMTP Configuration Test ---');
console.log('Host:', config.host);
console.log('Port:', config.port);
console.log('User:', config.user ? '*** (Set) ***' : '(Not Set)');
console.log('Pass:', config.pass ? '*** (Set) ***' : '(Not Set)');
console.log('-------------------------------');

if (!config.user || !config.pass) {
    console.error('❌ Error: EMAIL_USER or EMAIL_PASS not found in environment.');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
        user: config.user,
        pass: config.pass,
    },
});

console.log('Attempting to connect to SMTP server...');

transporter.verify((error, success) => {
    if (error) {
        console.error('❌ SMTP Connection Failed!');
        console.error('Error Details:', error.message);
        if (error.message.includes('Invalid login')) {
            console.log('\n💡 Tip: If using Gmail, make sure you are using an "App Password", not your regular password.');
        }
    } else {
        console.log('✅ SMTP Connection Successful!');
        console.log('Server is ready to send emails.');

        // Optional: send a test email
        // transporter.sendMail({
        //   from: config.from,
        //   to: config.user,
        //   subject: 'SMTP Test Email',
        //   text: 'The Biye Gmail service is working correctly!',
        // }).then((info) => {
        //   console.log('✅ Test email sent:', info.messageId);
        // }).catch((err) => {
        //   console.error('❌ Failed to send test email:', err.message);
        // });
    }
});
