import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';
import crypto from 'crypto';

export interface InvitationRequest {
    profileId: string;
    email: string;
    fullName: string;
    reason?: string;
}

export interface MemberReferral {
    referrerProfileId: string; // Obhijaat member creating the referral
    inviteeEmail: string;
    inviteeName: string;
    personalMessage?: string;
}

export interface InvitationApproval {
    invitationId: string;
    adminId: string;
    approved: boolean;
    rejectReason?: string;
    expiryDays?: number; // Default 30 days
}

export class InvitationService {
    /**
     * Generate a unique 8-character invitation code
     */
    private generateCode(): string {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    /**
     * Check if a profile has an active Obhijaat subscription
     */
    private async isObhijaatMember(profileId: string): Promise<boolean> {
        const subscription = await prisma.subscription.findFirst({
            where: {
                profileId,
                status: 'active',
                endAt: { gte: new Date() },
                plan: { code: 'OBHIJAAT' }
            }
        });
        return !!subscription;
    }

    /**
     * Request an invitation to Obhijaat tier (self-request)
     */
    async requestInvitation(data: InvitationRequest) {
        // Check if user already has a pending/approved request
        const existing = await prisma.invitationCode.findFirst({
            where: {
                profileId: data.profileId,
                status: { in: ['PENDING', 'APPROVED'] }
            }
        });

        if (existing) {
            if (existing.status === 'PENDING') {
                throw new Error('You already have a pending invitation request');
            }
            if (existing.status === 'APPROVED' && existing.code) {
                throw new Error('You already have an approved invitation code');
            }
        }

        const invitation = await prisma.invitationCode.create({
            data: {
                profileId: data.profileId,
                email: data.email,
                fullName: data.fullName,
                reason: data.reason,
                status: 'PENDING',
                isReferral: false
            }
        });

        logger.info('Invitation request created', { invitationId: invitation.id, profileId: data.profileId });

        return {
            id: invitation.id,
            status: invitation.status,
            message: 'Your invitation request has been submitted. You will be notified once it is reviewed.'
        };
    }

    /**
     * Obhijaat member creates a referral invitation for another user
     * Still requires admin approval before code is active
     */
    async createMemberReferral(data: MemberReferral) {
        // Verify the referrer is an active Obhijaat member
        const isObhijaat = await this.isObhijaatMember(data.referrerProfileId);
        if (!isObhijaat) {
            throw new Error('Only Obhijaat members can create referral invitations');
        }

        // Check if there's already a pending invitation for this email
        const existing = await prisma.invitationCode.findFirst({
            where: {
                email: data.inviteeEmail,
                status: { in: ['PENDING', 'APPROVED'] }
            }
        });

        if (existing) {
            throw new Error('An invitation for this email is already pending or approved');
        }

        // Create the referral invitation (pending admin approval)
        const invitation = await prisma.invitationCode.create({
            data: {
                profileId: '', // Will be filled when invitee creates profile
                email: data.inviteeEmail,
                fullName: data.inviteeName,
                reason: data.personalMessage || 'Referred by Obhijaat member',
                status: 'PENDING',
                isReferral: true,
                referredByProfileId: data.referrerProfileId
            }
        });

        logger.info('Member referral created', {
            invitationId: invitation.id,
            referrer: data.referrerProfileId,
            invitee: data.inviteeEmail
        });

        return {
            id: invitation.id,
            email: invitation.email,
            status: invitation.status,
            message: 'Referral invitation created. It will be reviewed by admin before activation.'
        };
    }

    /**
     * Get all referrals created by an Obhijaat member (for "My Invitations" section)
     */
    async getMyReferrals(profileId: string) {
        // Verify is Obhijaat member
        const isObhijaat = await this.isObhijaatMember(profileId);
        if (!isObhijaat) {
            return { referrals: [], canCreateReferrals: false };
        }

        const referrals = await prisma.invitationCode.findMany({
            where: { referredByProfileId: profileId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        return {
            referrals: referrals.map(r => ({
                id: r.id,
                email: r.email,
                fullName: r.fullName,
                status: r.status,
                code: r.status === 'APPROVED' ? r.code : undefined,
                usedAt: r.usedAt,
                createdAt: r.createdAt
            })),
            canCreateReferrals: true
        };
    }

    /**
     * Admin: Approve or reject an invitation request
     */
    async reviewInvitation(data: InvitationApproval) {
        const invitation = await prisma.invitationCode.findUnique({
            where: { id: data.invitationId }
        });

        if (!invitation) {
            throw new Error('Invitation request not found');
        }

        if (invitation.status !== 'PENDING') {
            throw new Error(`Cannot review invitation with status: ${invitation.status}`);
        }

        if (data.approved) {
            // Generate unique code and set expiry
            const code = this.generateCode();
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + (data.expiryDays || 30));

            const updated = await prisma.invitationCode.update({
                where: { id: data.invitationId },
                data: {
                    status: 'APPROVED',
                    code,
                    expiresAt,
                    reviewedBy: data.adminId,
                    reviewedAt: new Date()
                }
            });

            logger.info('Invitation approved', {
                invitationId: data.invitationId,
                code,
                isReferral: invitation.isReferral,
                referrer: invitation.referredByProfileId
            });

            return {
                id: updated.id,
                code: updated.code,
                email: updated.email,
                expiresAt: updated.expiresAt,
                status: 'APPROVED',
                isReferral: updated.isReferral
            };
        } else {
            // Reject the request
            const updated = await prisma.invitationCode.update({
                where: { id: data.invitationId },
                data: {
                    status: 'REJECTED',
                    rejectReason: data.rejectReason,
                    reviewedBy: data.adminId,
                    reviewedAt: new Date()
                }
            });

            logger.info('Invitation rejected', { invitationId: data.invitationId, reason: data.rejectReason });

            return {
                id: updated.id,
                status: 'REJECTED',
                rejectReason: updated.rejectReason
            };
        }
    }

    /**
     * Validate an invitation code for Obhijaat subscription
     */
    async validateCode(code: string, profileId: string) {
        const invitation = await prisma.invitationCode.findFirst({
            where: { code: code.toUpperCase() }
        });

        if (!invitation) {
            return { valid: false, error: 'Invalid invitation code' };
        }

        if (invitation.status === 'USED') {
            return { valid: false, error: 'This invitation code has already been used' };
        }

        if (invitation.status !== 'APPROVED') {
            return { valid: false, error: 'This invitation code is not valid' };
        }

        if (invitation.expiresAt && new Date() > invitation.expiresAt) {
            // Mark as expired
            await prisma.invitationCode.update({
                where: { id: invitation.id },
                data: { status: 'EXPIRED' }
            });
            return { valid: false, error: 'This invitation code has expired' };
        }

        return {
            valid: true,
            invitationId: invitation.id,
            isReferral: invitation.isReferral,
            referredBy: invitation.referredByProfileId,
            message: 'Invitation code is valid'
        };
    }

    /**
     * Use an invitation code (called after successful payment)
     */
    async useCode(code: string, profileId: string) {
        const validation = await this.validateCode(code, profileId);

        if (!validation.valid) {
            throw new Error(validation.error);
        }

        await prisma.invitationCode.update({
            where: { id: validation.invitationId },
            data: {
                status: 'USED',
                usedAt: new Date(),
                usedByProfileId: profileId
            }
        });

        logger.info('Invitation code used', { code, profileId, isReferral: validation.isReferral });

        return { success: true, message: 'Invitation code applied successfully' };
    }

    /**
     * Get all pending invitation requests (Admin)
     */
    async getPendingRequests(page: number = 1, limit: number = 20) {
        const skip = (page - 1) * limit;

        const [requests, total] = await Promise.all([
            prisma.invitationCode.findMany({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.invitationCode.count({ where: { status: 'PENDING' } })
        ]);

        return {
            data: requests.map(r => ({
                ...r,
                type: r.isReferral ? 'Member Referral' : 'Self Request'
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * Get invitation status for a profile
     */
    async getMyInvitationStatus(profileId: string) {
        const invitations = await prisma.invitationCode.findMany({
            where: { profileId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        if (invitations.length === 0) {
            return { hasRequest: false };
        }

        const latest = invitations[0];

        return {
            hasRequest: true,
            status: latest.status,
            code: latest.status === 'APPROVED' ? latest.code : undefined,
            expiresAt: latest.status === 'APPROVED' ? latest.expiresAt : undefined,
            rejectReason: latest.status === 'REJECTED' ? latest.rejectReason : undefined,
            createdAt: latest.createdAt
        };
    }
}

export const invitationService = new InvitationService();
