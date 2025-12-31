import { Request, Response, NextFunction } from 'express';
import { reportService } from './report.service.js';
import { CreateReportDTO } from './report.dto.js';
import { sendSuccess } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export class ReportController {
    async createReport(req: Request, res: Response, _next: NextFunction) {
        try {
            const userId = req.userId!;
            const dto: CreateReportDTO = req.body;

            logger.info('Create report request', {
                userId,
                reportedProfileId: dto.reportedProfileId,
                reason: dto.reason,
                requestId: req.requestId,
            });

            const result = await reportService.createReport(userId, dto);

            const message = result.message || 'Report submitted successfully';

            return sendSuccess(res, result, message, 201);
        } catch (error: any) {
            logger.error('Report submission failed', { error: error.message, stack: error.stack });

            if (error.message === 'Reported profile not found') {
                return res.status(404).json({ success: false, message: error.message });
            }
            if (error.message === 'You cannot report your own profile') {
                return res.status(400).json({ success: false, message: error.message });
            }
            // Catch-all for domain errors
            return res.status(400).json({ success: false, message: error.message || 'Report submission failed' });
        }
    }
}

export const reportController = new ReportController();
