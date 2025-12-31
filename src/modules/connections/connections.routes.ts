import { Router } from 'express';
import { connectionsController } from './connections.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import {
  SendInterestSchema,
  AcceptInterestSchema,
  DeclineInterestSchema,
  WithdrawInterestSchema,
} from './connections.dto.js';

const router = Router();

router.post(
  '/interest',
  authenticateToken,
  validate(SendInterestSchema),
  connectionsController.sendInterest.bind(connectionsController)
);

router.post(
  '/interest/accept',
  authenticateToken,
  validate(AcceptInterestSchema),
  connectionsController.acceptInterest.bind(connectionsController)
);

router.post(
  '/interest/decline',
  authenticateToken,
  validate(DeclineInterestSchema),
  connectionsController.declineInterest.bind(connectionsController)
);

router.post(
  '/interest/withdraw',
  authenticateToken,
  validate(WithdrawInterestSchema),
  connectionsController.withdrawInterest.bind(connectionsController)
);

router.get(
  '/interests/sent',
  authenticateToken,
  connectionsController.getSentInterests.bind(connectionsController)
);

router.get(
  '/interests/received',
  authenticateToken,
  connectionsController.getReceivedInterests.bind(connectionsController)
);

router.get(
  '/matches',
  authenticateToken,
  connectionsController.getMatches.bind(connectionsController)
);

export default router;
