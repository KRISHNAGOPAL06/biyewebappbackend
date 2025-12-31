import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { createThreadSchema, markAsReadSchema } from './chat.dto.js';

const router = Router();

// Thread routes
router.get('/threads', authenticateToken, chatController.getThreads.bind(chatController));
router.get('/threads/:threadId', authenticateToken, chatController.getThread.bind(chatController));
router.post('/threads', authenticateToken, validate(createThreadSchema), chatController.createThread.bind(chatController));
router.get('/threads/:threadId/messages', authenticateToken, chatController.getMessages.bind(chatController));
router.post('/threads/:threadId/read', authenticateToken, validate(markAsReadSchema), chatController.markAsRead.bind(chatController));

// Icebreaker routes
router.get('/icebreakers', authenticateToken, chatController.getIcebreakers.bind(chatController));
router.get('/icebreakers/limits', authenticateToken, chatController.getIcebreakerLimits.bind(chatController));
router.post('/icebreakers/send', authenticateToken, chatController.sendIcebreaker.bind(chatController));

export default router;
