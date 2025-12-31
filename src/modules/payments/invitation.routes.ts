import { Router } from 'express';
import { invitationController } from './invitation.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { requireAdmin } from '../../middleware/requireAdmin.js';

const router = Router();

// ==================== USER ENDPOINTS ====================

/**
 * POST /api/v1/invitations/request
 * Request an invitation to Obhijaat tier
 */
router.post('/request', authenticateToken, invitationController.requestInvitation);

/**
 * POST /api/v1/invitations/validate
 * Validate an invitation code before payment
 */
router.post('/validate', authenticateToken, invitationController.validateCode);

/**
 * GET /api/v1/invitations/status
 * Get current user's invitation status
 */
router.get('/status', authenticateToken, invitationController.getMyStatus);

// ==================== MEMBER REFERRAL ENDPOINTS ====================

/**
 * POST /api/v1/invitations/referral
 * Obhijaat member invites another user (requires admin approval)
 */
router.post('/referral', authenticateToken, invitationController.createReferral);

/**
 * GET /api/v1/invitations/my-referrals
 * View referrals created by current Obhijaat member
 */
router.get('/my-referrals', authenticateToken, invitationController.getMyReferrals);

// ==================== ADMIN ENDPOINTS ====================

/**
 * GET /api/v1/invitations/admin/pending
 * Get all pending invitation requests (Admin only)
 */
router.get('/admin/pending', authenticateToken, requireAdmin, invitationController.getPendingRequests);

/**
 * POST /api/v1/invitations/admin/:id/review
 * Approve or reject an invitation (Admin only)
 */
router.post('/admin/:id/review', authenticateToken, requireAdmin, invitationController.reviewInvitation);

export default router;
