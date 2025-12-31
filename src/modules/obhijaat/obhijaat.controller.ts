// Obhijaat Elite Membership - Controller
import { Request, Response, NextFunction } from 'express';
import { obhijaatService } from './obhijaat.service.js';
import { logger } from '../../utils/logger.js';

class ObhijaatController {
    /**
     * POST /api/v1/obhijaat/invitation
     * Submit an invitation request to the admin
     */
    async submitInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const profileId = (req as any).user?.profileId;

            if (!profileId) {
                res.status(401).json({
                    success: false,
                    error: { message: 'Profile not found. Please complete your profile first.' },
                });
                return;
            }

            const { inviteeName, inviteeEmail, inviteePhone, message } = req.body;

            // Validate required fields
            if (!inviteeName || !inviteeEmail) {
                res.status(400).json({
                    success: false,
                    error: { message: 'Invitee name and email are required' },
                });
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(inviteeEmail)) {
                res.status(400).json({
                    success: false,
                    error: { message: 'Invalid email format' },
                });
                return;
            }

            const invitation = await obhijaatService.submitInvitation(profileId, {
                inviteeName,
                inviteeEmail,
                inviteePhone,
                message,
            });

            res.status(201).json({
                success: true,
                data: invitation,
                message: 'Invitation request submitted successfully. The admin will review it shortly.',
            });
        } catch (error: any) {
            logger.error('Submit invitation error', { error: error.message });

            if (error.message.includes('Only active Obhijaat members')) {
                res.status(403).json({
                    success: false,
                    error: { message: error.message },
                });
                return;
            }

            if (error.message.includes('already been sent')) {
                res.status(409).json({
                    success: false,
                    error: { message: error.message },
                });
                return;
            }

            next(error);
        }
    }

    /**
     * GET /api/v1/obhijaat/my-invitations
     * Get all invitations sent by the current member
     */
    async getMyInvitations(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const profileId = (req as any).user?.profileId;

            if (!profileId) {
                res.status(401).json({
                    success: false,
                    error: { message: 'Profile not found.' },
                });
                return;
            }

            const invitations = await obhijaatService.getMyInvitations(profileId);

            res.json({
                success: true,
                data: invitations,
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/v1/obhijaat/membership-status
     * Check current Obhijaat membership status
     */
    async getMembershipStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const profileId = (req as any).user?.profileId;

            if (!profileId) {
                res.status(401).json({
                    success: false,
                    error: { message: 'Profile not found.' },
                });
                return;
            }

            const memberInfo = await obhijaatService.getMemberInfo(profileId);

            res.json({
                success: true,
                data: {
                    isObhijaatMember: !!memberInfo?.isActive,
                    memberInfo: memberInfo || null,
                },
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/v1/obhijaat/visibility
     * Toggle invisibility mode
     */
    async setVisibility(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const profileId = (req as any).user?.profileId;
            const { isInvisible } = req.body;

            if (!profileId) {
                res.status(401).json({
                    success: false,
                    error: { message: 'Profile not found.' },
                });
                return;
            }

            if (typeof isInvisible !== 'boolean') {
                res.status(400).json({
                    success: false,
                    error: { message: 'isInvisible must be a boolean' },
                });
                return;
            }

            await obhijaatService.setInvisibility(profileId, isInvisible);

            res.json({
                success: true,
                message: isInvisible ? 'You are now invisible to other users' : 'You are now visible to other users',
            });
        } catch (error: any) {
            if (error.message.includes('Only Obhijaat members')) {
                res.status(403).json({
                    success: false,
                    error: { message: error.message },
                });
                return;
            }
            next(error);
        }
    }

    /**
     * POST /api/v1/obhijaat/approved-viewers
     * Add a user to approved viewers list
     */
    async approveViewer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const profileId = (req as any).user?.profileId;
            const { viewerUserId } = req.body;

            if (!profileId) {
                res.status(401).json({
                    success: false,
                    error: { message: 'Profile not found.' },
                });
                return;
            }

            if (!viewerUserId) {
                res.status(400).json({
                    success: false,
                    error: { message: 'viewerUserId is required' },
                });
                return;
            }

            await obhijaatService.approveViewer(profileId, viewerUserId);

            res.json({
                success: true,
                message: 'Viewer approved successfully',
            });
        } catch (error: any) {
            if (error.message.includes('Only Obhijaat members')) {
                res.status(403).json({
                    success: false,
                    error: { message: error.message },
                });
                return;
            }
            next(error);
        }
    }

    /**
     * DELETE /api/v1/obhijaat/approved-viewers/:viewerUserId
     * Remove a user from approved viewers list
     */
    async revokeViewer(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const profileId = (req as any).user?.profileId;
            const { viewerUserId } = req.params;

            if (!profileId) {
                res.status(401).json({
                    success: false,
                    error: { message: 'Profile not found.' },
                });
                return;
            }

            await obhijaatService.revokeViewer(profileId, viewerUserId);

            res.json({
                success: true,
                message: 'Viewer access revoked',
            });
        } catch (error) {
            next(error);
        }
    }
}

export const obhijaatController = new ObhijaatController();
