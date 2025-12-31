import admin from 'firebase-admin';
import { logger } from '../../utils/logger.js';

let initialized = false;

export function initFCM(): void {
  if (initialized) return;

  try {
    const projectId = process.env.FCM_PROJECT_ID;
    const clientEmail = process.env.FCM_CLIENT_EMAIL;
    const privateKey = process.env.FCM_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      logger.warn('⚠️ FCM not initialized — missing credentials (FCM_PROJECT_ID, FCM_CLIENT_EMAIL, or FCM_PRIVATE_KEY)');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    initialized = true;
    logger.info('✅ Firebase Cloud Messaging initialized successfully');
  } catch (err) {
    logger.warn('⚠️ FCM initialization failed:', {
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    initialized = false;
  }
}

export async function sendPushNotification(
  fcmToken: string,
  title: string,
  body: string,
  metadata: Record<string, any> = {}
): Promise<boolean> {
  if (!fcmToken) {
    logger.warn('Push notification not sent: no FCM token provided');
    return false;
  }

  initFCM();

  try {
    // Convert metadata values to strings (FCM data payload requirement)
    const dataPayload: Record<string, string> = {};
    if (metadata && typeof metadata === 'object') {
      Object.entries(metadata).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          dataPayload[key] = String(value);
        }
      });
    }

    const message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      data: dataPayload,
    };

    const messageId = await admin.messaging().send(message);

    logger.info('Push notification sent successfully via FCM', {
      fcmToken: fcmToken.substring(0, 20) + '...',
      title,
      messageId,
    });

    return true;
  } catch (err) {
    logger.error('FCM push notification failed', {
      fcmToken: fcmToken.substring(0, 20) + '...',
      title,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
    return false;
  }
}
