// Obhijaat Elite Membership - TypeScript Types

export interface ObhijaatInvitationRequest {
    inviteeName: string;
    inviteeEmail: string;
    inviteePhone?: string;
    message?: string;
}

export interface ObhijaatInvitationResponse {
    id: string;
    fromProfileId: string;
    inviteeName: string;
    inviteeEmail: string;
    inviteePhone: string | null;
    message: string | null;
    status: string;
    sentAt: Date;
    processedAt: Date | null;
}

export interface ObhijaatMemberInfo {
    profileId: string;
    displayName: string | null;
    email: string;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    isActive: boolean;
}
