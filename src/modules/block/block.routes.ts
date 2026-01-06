import { Router } from 'express';
import { blockController } from './block.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { BlockUserSchema } from './block.dto.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// POST /api/v1/blocks - Block a user
router.post(
    '/',
    validate(BlockUserSchema),
    blockController.blockUser.bind(blockController)
);

// DELETE /api/v1/blocks/:blockedUserId - Unblock a user
router.delete(
    '/:blockedUserId',
    blockController.unblockUser.bind(blockController)
);

// GET /api/v1/blocks - Get blocked users list
router.get(
    '/',
    blockController.getBlockedUsers.bind(blockController)
);

export default router;
