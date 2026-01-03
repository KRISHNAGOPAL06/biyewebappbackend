import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtcRole } = pkg;
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

export class AgoraService {
    private appId: string;
    private appCertificate: string;

    constructor() {
        this.appId = env.AGORA_APP_ID || '';
        this.appCertificate = env.AGORA_APP_CERTIFICATE || '';

        if (!this.appId || !this.appCertificate) {
            logger.warn('[AgoraService] AGORA_APP_ID or AGORA_APP_CERTIFICATE is missing. Token generation will fail.');
        }
    }

    /**
     * Generates an RTC token for a specific channel and user
     * @param channelName The channel name (usually chatId or a unique room ID)
     * @param userId The UID of the user (must be a number for Agora RTC)
     * @param role The role of the user (publisher or subscriber)
     * @param expiryTimeInSeconds How long the token remains valid (default: 3600s)
     */
    generateRtcToken(
        channelName: string,
        userId: number,
        role: any = RtcRole.PUBLISHER,
        expiryTimeInSeconds: number = 3600
    ): string {
        if (!this.appId || !this.appCertificate) {
            // In development, if keys are missing, we might want to return a mock or re-throw
            if (env.NODE_ENV === 'development') {
                logger.info('[AgoraService] Dev Mode: Returning mock token due to missing keys');
                return `mock_token_${channelName}_${userId}`;
            }
            throw new Error('Agora configuration missing');
        }

        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expiryTimeInSeconds;

        try {
            const token = RtcTokenBuilder.buildTokenWithUid(
                this.appId,
                this.appCertificate,
                channelName,
                userId,
                role,
                privilegeExpiredTs
            );

            return token;
        } catch (error) {
            logger.error('[AgoraService] Error generating RTC token:', error);
            throw new Error('Failed to generate Agora token');
        }
    }

    getAppId(): string {
        return this.appId;
    }
}

export const agoraService = new AgoraService();
