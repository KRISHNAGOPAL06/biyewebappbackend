import { Request, Response } from 'express';
import { invitationService } from './invitation.service.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../prisma.js';

export class InvitationController {
    /**
     * Helper to get profileId from userId
     */
    private async getProfileId(userId: string): Promise<string | null> {
        const profile = await prisma.profile.findFirst({
            where: { userId },
            select: { id: true }
        });
        return profile?.id || null;
    }

    /**
     * POST /api/v1/invitations/request
     * Request an Obhijaat invitation
     */
    async requestInvitation(req: Request, res: Response) {
        try {
            const userId = req.userId;
            const { email, fullName, reason } = req.body;

            if (!userId) {
                return res.status(401).json({ error: { message: 'Unauthorized' } });
            }

            const profileId = await invitationController.getProfileId(userId);
            if (!profileId) {
                return res.status(400).json({ error: { message: 'Profile not found' } });
            }

            if (!email || !fullName) {
                return res.status(400).json({ error: { message: 'Email and full name are required' } });
            }

            const result = await invitationService.requestInvitation({
                profileId,
                email,
                fullName,
                reason
            });

            return res.status(201).json({ data: result });
        } catch (error: any) {
            logger.error('Error requesting invitation', { error: error.message });
            return res.status(400).json({ error: { message: error.message } });
        }
    }

    /**
     * POST /api/v1/invitations/validate
     * Validate an invitation code
     */
    async validateCode(req: Request, res: Response) {
        try {
            const userId = req.userId;
            const { code } = req.body;

            if (!userId) {
                return res.status(401).json({ error: { message: 'Unauthorized' } });
            }

            const profileId = await invitationController.getProfileId(userId);
            if (!profileId) {
                return res.status(400).json({ error: { message: 'Profile not found' } });
            }

            if (!code) {
                return res.status(400).json({ error: { message: 'Invitation code is required' } });
            }

            const result = await invitationService.validateCode(code, profileId);

            if (!result.valid) {
                return res.status(400).json({ error: { message: result.error } });
            }

            return res.status(200).json({ data: result });
        } catch (error: any) {
            logger.error('Error validating invitation code', { error: error.message });
            return res.status(400).json({ error: { message: error.message } });
        }
    }

    /**
     * GET /api/v1/invitations/status
     * Get user's invitation status
     */
    async getMyStatus(req: Request, res: Response) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({ error: { message: 'Unauthorized' } });
            }

            const profileId = await invitationController.getProfileId(userId);
            if (!profileId) {
                return res.status(400).json({ error: { message: 'Profile not found' } });
            }

            const result = await invitationService.getMyInvitationStatus(profileId);

            return res.status(200).json({ data: result });
        } catch (error: any) {
            logger.error('Error getting invitation status', { error: error.message });
            return res.status(500).json({ error: { message: 'Failed to get invitation status' } });
        }
    }

    // ==================== MEMBER REFERRAL ENDPOINTS ====================

    /**
     * POST /api/v1/invitations/referral
     * Obhijaat member creates a referral for another user
     */
    async createReferral(req: Request, res: Response) {
        try {
            const userId = req.userId;
            const { email, fullName, personalMessage } = req.body;

            if (!userId) {
                return res.status(401).json({ error: { message: 'Unauthorized' } });
            }

            const profileId = await invitationController.getProfileId(userId);
            if (!profileId) {
                return res.status(400).json({ error: { message: 'Profile not found' } });
            }

            if (!email || !fullName) {
                return res.status(400).json({ error: { message: 'Email and full name of invitee are required' } });
            }

            const result = await invitationService.createMemberReferral({
                referrerProfileId: profileId,
                inviteeEmail: email,
                inviteeName: fullName,
                personalMessage
            });

            return res.status(201).json({ data: result });
        } catch (error: any) {
            logger.error('Error creating referral', { error: error.message });
            return res.status(400).json({ error: { message: error.message } });
        }
    }

    /**
     * GET /api/v1/invitations/my-referrals
     * Obhijaat member views their referrals (for "Invite Members" section)
     */
    async getMyReferrals(req: Request, res: Response) {
        try {
            const userId = req.userId;

            if (!userId) {
                return res.status(401).json({ error: { message: 'Unauthorized' } });
            }

            const profileId = await invitationController.getProfileId(userId);
            if (!profileId) {
                return res.status(400).json({ error: { message: 'Profile not found' } });
            }

            const result = await invitationService.getMyReferrals(profileId);

            return res.status(200).json({ data: result });
        } catch (error: any) {
            logger.error('Error getting referrals', { error: error.message });
            return res.status(500).json({ error: { message: 'Failed to get referrals' } });
        }
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * GET /api/v1/admin/invitations/pending
     * Get all pending invitation requests (Admin only)
     */
    async getPendingRequests(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 20;

            const result = await invitationService.getPendingRequests(page, limit);

            return res.status(200).json({ data: result });
        } catch (error: any) {
            logger.error('Error getting pending invitations', { error: error.message });
            return res.status(500).json({ error: { message: 'Failed to get pending invitations' } });
        }
    }

    /**
     * POST /api/v1/admin/invitations/:id/review
     * Approve or reject an invitation request (Admin only)
     */
    async reviewInvitation(req: Request, res: Response) {
        try {
            const invitationId = req.params.id;
            const adminId = req.userId; // Admin user ID from auth
            const { approved, rejectReason, expiryDays } = req.body;

            if (!adminId) {
                return res.status(401).json({ error: { message: 'Unauthorized' } });
            }

            if (typeof approved !== 'boolean') {
                return res.status(400).json({ error: { message: 'approved field is required (true/false)' } });
            }

            if (!approved && !rejectReason) {
                return res.status(400).json({ error: { message: 'rejectReason is required when rejecting' } });
            }

            const result = await invitationService.reviewInvitation({
                invitationId,
                adminId,
                approved,
                rejectReason,
                expiryDays
            });

            return res.status(200).json({ data: result });
        } catch (error: any) {
            logger.error('Error reviewing invitation', { error: error.message });
            return res.status(400).json({ error: { message: error.message } });
        }
    }
}

export const invitationController = new InvitationController();
