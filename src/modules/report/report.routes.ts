import { Router } from 'express';
import { reportController } from './report.controller.js';
import { authenticateToken } from '../../middleware/authMiddleware.js';
import { validate } from '../../middleware/validate.js';
import { CreateReportSchema } from './report.dto.js';

const router = Router();

router.post(
    '/',
    authenticateToken,
    validate(CreateReportSchema),
    reportController.createReport.bind(reportController)
);

export default router;
