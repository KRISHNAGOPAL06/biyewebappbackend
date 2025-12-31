import { CreateReportDTO } from './report.dto.js';
import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';

export class ReportService {
    async createReport(reporterUserId: string, dto: CreateReportDTO) {
        const { reportedProfileId, reason, details, screenshotUrl } = dto;

        // Validate that the reported profile exists
        const profile = await prisma.profile.findUnique({
            where: { id: reportedProfileId },
        });

        if (!profile) {
            throw new Error('Reported profile not found');
        }

        // Prevent self-reporting
        if (profile.userId === reporterUserId) {
            throw new Error('You cannot report your own profile');
        }

        // Check for existing pending report from this user for the same profile
        const existingReport = await prisma.report.findFirst({
            where: {
                reporterUserId,
                reportedProfileId,
                status: 'pending',
            },
        });

        if (existingReport) {
            logger.info('Duplicate report prevented', {
                reporterUserId,
                reportedProfileId,
                existingReportId: existingReport.id,
            });
            return {
                id: existingReport.id,
                message: 'You have already reported this profile',
                status: existingReport.status,
            };
        }

        // Create the report
        const report = await prisma.report.create({
            data: {
                reporterUserId,
                reportedProfileId,
                reason,
                details,
                screenshotUrl,
                status: 'pending',
            },
        });

        logger.info('Report created successfully', {
            reportId: report.id,
            reporterUserId,
            reportedProfileId,
            reason,
        });

        return {
            id: report.id,
            status: report.status,
            createdAt: report.createdAt,
        };
    }
}

export const reportService = new ReportService();
