interface TemplateData {
  [key: string]: any;
}

interface NotificationTemplate {
  title: string;
  body: string;
  emailSubject?: string;
  emailBody?: string;
}

type TemplateFunction = (data: TemplateData) => NotificationTemplate;

export const templates: Record<string, TemplateFunction> = {
  otp: (data) => ({
    title: 'Verify your email',
    body: `Your OTP is ${data.otp}. It will expire in ${data.expiryMinutes || 10} minutes.`,
    emailSubject: 'Your Verification Code',
    emailBody: `
      <h2>Email Verification</h2>
      <p>Your one-time password (OTP) is:</p>
      <h1 style="font-size: 32px; letter-spacing: 5px; color: #4A90A4;">${data.otp}</h1>
      <p>This code will expire in ${data.expiryMinutes || 10} minutes.</p>
      <p>If you did not request this code, please ignore this email.</p>
    `,
  }),

  interest_received: (data) => ({
    title: 'You have a new interest!',
    body: `${data.fromName || 'Someone'} has shown interest in your profile`,
    emailSubject: 'Someone is interested in you!',
    emailBody: `
      <h2>New Interest Received</h2>
      <p>${data.fromName || 'A user'} has shown interest in your profile.</p>
      <p>Log in to view their profile and respond to their interest.</p>
    `,
  }),

  interest_accepted: (data) => ({
    title: 'Your interest was accepted!',
    body: `${data.acceptedByName || 'Someone'} has accepted your interest. You can now start a conversation!`,
    emailSubject: 'Great news! Your interest was accepted',
    emailBody: `
      <h2>Interest Accepted!</h2>
      <p>${data.acceptedByName || 'A user'} has accepted your interest.</p>
      <p>You can now start a conversation with them. Log in to begin chatting!</p>
    `,
  }),

  new_message: (data) => ({
    title: 'New message received',
    body: `${data.fromName || 'Someone'} sent you a message`,
    emailSubject: 'You have a new message',
    emailBody: `
      <h2>New Message</h2>
      <p>You have received a new message from ${data.fromName || 'a user'}.</p>
      <p>Log in to read and respond to their message.</p>
    `,
  }),

  profile_view: (data) => ({
    title: 'Someone viewed your profile',
    body: `${data.viewerName || 'A user'} viewed your profile`,
  }),

  guardian_added: (data) => ({
    title: 'You have been added as a guardian',
    body: `You have been added as a ${data.relationship || 'guardian'} for ${data.candidateName || 'a profile'}`,
    emailSubject: 'You have been added as a guardian',
    emailBody: `
      <h2>Guardian Access Granted</h2>
      <p>You have been added as a ${data.relationship || 'guardian'} for ${data.candidateName || 'a profile'}.</p>
      <p>You can now help manage their matrimonial profile. Log in to get started.</p>
    `,
  }),

  subscription: (data) => ({
    title: 'Subscription update',
    body: data.action === 'purchased'
      ? `Your ${data.planName || 'subscription'} is now active!`
      : `Your ${data.planName || 'subscription'} will expire on ${data.expiryDate || 'soon'}`,
    emailSubject: data.action === 'purchased' ? 'Subscription Activated' : 'Subscription Expiring Soon',
    emailBody: data.action === 'purchased'
      ? `
        <h2>Subscription Activated</h2>
        <p>Your ${data.planName || 'subscription'} is now active.</p>
        <p>Thank you for subscribing! Enjoy all premium features.</p>
      `
      : `
        <h2>Subscription Expiring</h2>
        <p>Your ${data.planName || 'subscription'} will expire on ${data.expiryDate || 'soon'}.</p>
        <p>Renew now to continue enjoying premium features.</p>
      `,
  }),

  moderation: (data) => ({
    title: 'Profile moderation update',
    body: data.action === 'approved'
      ? 'Your profile/photo has been approved'
      : `Your ${data.contentType || 'content'} requires attention: ${data.reason || 'Please review our guidelines'}`,
    emailSubject: data.action === 'approved' ? 'Content Approved' : 'Action Required: Content Review',
    emailBody: data.action === 'approved'
      ? `
        <h2>Content Approved</h2>
        <p>Your ${data.contentType || 'content'} has been reviewed and approved.</p>
        <p>It is now visible to other users.</p>
      `
      : `
        <h2>Content Review Required</h2>
        <p>Your ${data.contentType || 'content'} requires your attention.</p>
        <p>Reason: ${data.reason || 'Please review our community guidelines.'}</p>
        <p>Log in to make the necessary changes.</p>
      `,
  }),

  subscription_activated: (data) => ({
    title: 'Subscription activated!',
    body: `Your ${data.planName || 'subscription'} is now active until ${data.endAt ? new Date(data.endAt).toLocaleDateString() : 'next month'}`,
    emailSubject: 'Your Subscription is Now Active!',
    emailBody: `
      <h2>Subscription Activated</h2>
      <p>Your <strong>${data.planName || 'subscription'}</strong> plan is now active!</p>
      <p>Your subscription is valid until ${data.endAt ? new Date(data.endAt).toLocaleDateString() : 'next month'}.</p>
      <p>Enjoy all the premium features that come with your plan.</p>
    `,
  }),

  subscription_expired: (data) => ({
    title: 'Subscription expired',
    body: `Your ${data.planName || 'subscription'} has expired. Renew now to continue enjoying premium features.`,
    emailSubject: 'Your Subscription Has Expired',
    emailBody: `
      <h2>Subscription Expired</h2>
      <p>Your <strong>${data.planName || 'subscription'}</strong> plan has expired.</p>
      <p>Renew now to continue enjoying premium features and connecting with potential matches.</p>
    `,
  }),

  subscription_upgraded: (data) => ({
    title: 'Subscription upgraded!',
    body: `You have upgraded to ${data.newPlanName || 'a new plan'}. Enjoy your new features!`,
    emailSubject: 'Subscription Upgraded Successfully!',
    emailBody: `
      <h2>Subscription Upgraded</h2>
      <p>Congratulations! You have upgraded from <strong>${data.oldPlanCode || 'your previous plan'}</strong> to <strong>${data.newPlanName || 'a new plan'}</strong>.</p>
      <p>Enjoy all the additional features that come with your upgraded plan.</p>
    `,
  }),

  payment_failed: (data) => ({
    title: 'Payment failed',
    body: `Your payment of ৳${data.amount || '0'} could not be processed. Please try again.`,
    emailSubject: 'Payment Failed - Action Required',
    emailBody: `
      <h2>Payment Failed</h2>
      <p>We were unable to process your payment of <strong>৳${data.amount || '0'}</strong>.</p>
      <p>Please try again with a different payment method or contact your bank for assistance.</p>
    `,
  }),
};

export function getTemplate(type: string, data: TemplateData): NotificationTemplate {
  const templateFn = templates[type];
  if (!templateFn) {
    return {
      title: 'Notification',
      body: data.message || 'You have a new notification',
    };
  }
  return templateFn(data);
}
