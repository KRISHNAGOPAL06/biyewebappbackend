import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface GooglePayload {
    email: string;
    email_verified: boolean;
    given_name?: string;
    family_name?: string;
    sub: string; // Google user ID
}

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
    const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.email_verified) {
        throw new Error('Invalid Google token');
    }

    return payload as GooglePayload;
}
