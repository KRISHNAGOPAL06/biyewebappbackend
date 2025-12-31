// Obhijaat Elite Membership - Routes
import { Router } from 'express';
import { obhijaatController } from './obhijaat.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';

const router = Router();

// All Obhijaat routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/v1/obhijaat/membership-status
 * @desc    Check current Obhijaat membership status
 * @access  Protected
 */
router.get('/membership-status', obhijaatController.getMembershipStatus);

/**
 * @route   POST /api/v1/obhijaat/invitation
 * @desc    Submit an invitation/referral request to admin
 * @access  Protected (Obhijaat members only)
 */
router.post('/invitation', obhijaatController.submitInvitation);

/**
 * @route   GET /api/v1/obhijaat/my-invitations
 * @desc    Get all invitations sent by the current member
 * @access  Protected
 */
router.get('/my-invitations', obhijaatController.getMyInvitations);

/**
 * @route   PUT /api/v1/obhijaat/visibility
 * @desc    Toggle invisibility mode (Obhijaat only)
 * @access  Protected (Obhijaat members only)
 */
router.put('/visibility', obhijaatController.setVisibility);

/**
 * @route   POST /api/v1/obhijaat/approved-viewers
 * @desc    Add a user to approved viewers list
 * @access  Protected (Obhijaat members only)
 */
router.post('/approved-viewers', obhijaatController.approveViewer);

/**
 * @route   DELETE /api/v1/obhijaat/approved-viewers/:viewerUserId
 * @desc    Remove a user from approved viewers list
 * @access  Protected (Obhijaat members only)
 */
router.delete('/approved-viewers/:viewerUserId', obhijaatController.revokeViewer);

export default router;
