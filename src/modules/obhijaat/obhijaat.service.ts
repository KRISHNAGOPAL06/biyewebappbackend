// Obhijaat Elite Membership - Service Layer
import { prisma } from '../../prisma.js';
import { logger } from '../../utils/logger.js';
import { ObhijaatInvitationRequest, ObhijaatInvitationResponse, ObhijaatMemberInfo } from './obhijaat.types.js';
import { transporter } from '../../config/email.js';

// Email transporter for admin notifications
// Using shared transporter from config/email.ts


class ObhijaatService {
    /**
     * Check if a profile has an active Obhijaat subscription
     */
    async isActiveObhijaatMember(profileId: string): Promise<boolean> {
        const subscription = await prisma.subscription.findFirst({
            where: {
                profileId,
                status: 'active',
                endAt: { gte: new Date() },
                plan: { code: 'OBHIJAAT' },
            },
            include: { plan: true },
        });

        return !!subscription;
    }

    /**
     * Get detailed Obhijaat member information
     */
    async getMemberInfo(profileId: string): Promise<ObhijaatMemberInfo | null> {
        const subscription = await prisma.subscription.findFirst({
            where: {
                profileId,
                status: 'active',
                plan: { code: 'OBHIJAAT' },
            },
            include: {
                plan: true,
                profile: {
                    include: {
                        user: { select: { email: true } },
                    },
                },
            },
            orderBy: { startAt: 'desc' },
        });

        if (!subscription) {
            return null;
        }

        return {
            profileId: subscription.profileId,
            displayName: subscription.profile.displayName,
            email: subscription.profile.user.email,
            subscriptionStartDate: subscription.startAt,
            subscriptionEndDate: subscription.endAt,
            isActive: subscription.status === 'active' && subscription.endAt >= new Date(),
        };
    }

    /**
     * Submit an invitation/referral request to the admin
     */
    async submitInvitation(
        profileId: string,
        request: ObhijaatInvitationRequest
    ): Promise<ObhijaatInvitationResponse> {
        // Verify the member has an active Obhijaat subscription
        const memberInfo = await this.getMemberInfo(profileId);

        if (!memberInfo || !memberInfo.isActive) {
            throw new Error('Only active Obhijaat members can send invitations');
        }

        // Check for duplicate invitation to same email
        const existingInvitation = await prisma.obhijaatInvitation.findFirst({
            where: {
                fromProfileId: profileId,
                inviteeEmail: request.inviteeEmail.toLowerCase(),
                status: { in: ['pending', 'approved'] },
            },
        });

        if (existingInvitation) {
            throw new Error('An invitation has already been sent to this email');
        }

        // Create the invitation record
        const invitation = await prisma.obhijaatInvitation.create({
            data: {
                fromProfileId: profileId,
                inviteeName: request.inviteeName.trim(),
                inviteeEmail: request.inviteeEmail.toLowerCase().trim(),
                inviteePhone: request.inviteePhone?.trim() || null,
                message: request.message?.trim() || null,
                status: 'pending',
            },
        });

        // Send email notification to admin
        await this.sendAdminNotification(memberInfo, invitation);

        logger.info('Obhijaat invitation submitted', {
            invitationId: invitation.id,
            fromProfileId: profileId,
            inviteeEmail: request.inviteeEmail,
        });

        return this.formatInvitationResponse(invitation);
    }

    /**
     * Get all invitations sent by a member
     */
    async getMyInvitations(profileId: string): Promise<ObhijaatInvitationResponse[]> {
        const invitations = await prisma.obhijaatInvitation.findMany({
            where: { fromProfileId: profileId },
            orderBy: { sentAt: 'desc' },
        });

        return invitations.map(this.formatInvitationResponse);
    }

    /**
     * Send email notification to admin about new invitation request
     */
    private async sendAdminNotification(
        member: ObhijaatMemberInfo,
        invitation: any
    ): Promise<void> {
        const adminEmail = process.env.OBHIJAAT_SUPPORT_EMAIL || 'support@biyeco.in';

        const html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Noto+Serif:wght@400;600;700&display=swap');
    </style>
  </head>
  <body style="margin:0; padding:0; background:#f5f5f5;">
    <div style="
      font-family: 'Noto Serif', serif;
      max-width:600px;
      margin:20px auto;
      padding:24px;
      background:#ffffff;
      border-radius:8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    ">
      <div style="text-align:center; margin-bottom:20px;">
        <span style="
          background: linear-gradient(135deg, #D4AF37, #FFD700);
          color: #2e1b47;
          padding: 8px 16px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 14px;
        ">🏆 OBHIJAAT INVITATION REQUEST</span>
      </div>
      
      <h2 style="color:#2e1b47; margin-bottom:20px;">New Invitation Request</h2>
      
      <div style="background:#f9f7fc; padding:16px; border-radius:8px; margin-bottom:20px;">
        <h3 style="color:#3d2d5a; margin-top:0;">From Member:</h3>
        <table style="width:100%;">
          <tr>
            <td style="color:#666; padding:4px 0;">Name:</td>
            <td style="color:#2e1b47; font-weight:600;">${member.displayName || 'N/A'}</td>
          </tr>
          <tr>
            <td style="color:#666; padding:4px 0;">Email:</td>
            <td style="color:#2e1b47;">${member.email}</td>
          </tr>
          <tr>
            <td style="color:#666; padding:4px 0;">Profile ID:</td>
            <td style="color:#2e1b47; font-size:12px;">${member.profileId}</td>
          </tr>
          <tr>
            <td style="color:#666; padding:4px 0;">Member Since:</td>
            <td style="color:#2e1b47;">${member.subscriptionStartDate.toLocaleDateString()}</td>
          </tr>
          <tr>
            <td style="color:#666; padding:4px 0;">Subscription Valid Until:</td>
            <td style="color:#2e1b47;">${member.subscriptionEndDate.toLocaleDateString()}</td>
          </tr>
        </table>
      </div>
      
      <div style="background:#fff8e6; padding:16px; border-radius:8px; margin-bottom:20px; border-left:4px solid #D4AF37;">
        <h3 style="color:#8B7500; margin-top:0;">Invitee Details:</h3>
        <table style="width:100%;">
          <tr>
            <td style="color:#666; padding:4px 0;">Name:</td>
            <td style="color:#2e1b47; font-weight:600;">${invitation.inviteeName}</td>
          </tr>
          <tr>
            <td style="color:#666; padding:4px 0;">Email:</td>
            <td style="color:#2e1b47;">${invitation.inviteeEmail}</td>
          </tr>
          ${invitation.inviteePhone ? `
          <tr>
            <td style="color:#666; padding:4px 0;">Phone:</td>
            <td style="color:#2e1b47;">${invitation.inviteePhone}</td>
          </tr>
          ` : ''}
        </table>
      </div>
      
      ${invitation.message ? `
      <div style="background:#f0f0f0; padding:16px; border-radius:8px; margin-bottom:20px;">
        <h3 style="color:#3d2d5a; margin-top:0;">Personal Message:</h3>
        <p style="color:#2e1b47; font-style:italic; margin:0;">"${invitation.message}"</p>
      </div>
      ` : ''}
      
      <div style="text-align:center; padding:16px; background:#f9f7fc; border-radius:8px;">
        <p style="color:#666; margin:0; font-size:12px;">
          Submitted on: ${new Date().toLocaleString()}
        </p>
        <p style="color:#666; margin:8px 0 0; font-size:12px;">
          Invitation ID: ${invitation.id}
        </p>
      </div>
      
      <hr style="margin-top:20px; border:none; border-top:1px solid #ddd;">
      <p style="color:#888; font-size:12px; text-align:center;">
        This is an automated notification from Biye Co. Obhijaat Membership System.
      </p>
    </div>
  </body>
</html>
    `;

        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"Biye Co." <noreply@biyeco.in>',
                to: adminEmail,
                subject: `[Obhijaat] New Invitation Request from ${member.displayName || member.email}`,
                html,
            });

            logger.info('Obhijaat admin notification sent', {
                adminEmail,
                invitationId: invitation.id,
            });
        } catch (error) {
            logger.error('Failed to send Obhijaat admin notification', {
                error: error instanceof Error ? error.message : 'Unknown error',
                invitationId: invitation.id,
            });
            // Don't throw - the invitation is already saved
        }
    }

    /**
     * Format invitation for API response
     */
    private formatInvitationResponse(invitation: any): ObhijaatInvitationResponse {
        return {
            id: invitation.id,
            fromProfileId: invitation.fromProfileId,
            inviteeName: invitation.inviteeName,
            inviteeEmail: invitation.inviteeEmail,
            inviteePhone: invitation.inviteePhone,
            message: invitation.message,
            status: invitation.status,
            sentAt: invitation.sentAt,
            processedAt: invitation.processedAt,
        };
    }

    /**
     * Toggle invisibility for Obhijaat member
     */
    async setInvisibility(profileId: string, isInvisible: boolean): Promise<void> {
        const isMember = await this.isActiveObhijaatMember(profileId);

        if (!isMember) {
            throw new Error('Only Obhijaat members can use invisibility mode');
        }

        await prisma.profile.update({
            where: { id: profileId },
            data: { isInvisible },
        });

        logger.info('Obhijaat member invisibility updated', {
            profileId,
            isInvisible,
        });
    }

    /**
     * Add a user to approved viewers list
     */
    async approveViewer(profileId: string, viewerUserId: string): Promise<void> {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { approvedViewers: true },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const isMember = await this.isActiveObhijaatMember(profileId);
        if (!isMember) {
            throw new Error('Only Obhijaat members can manage approved viewers');
        }

        const viewers = profile.approvedViewers || [];
        if (!viewers.includes(viewerUserId)) {
            await prisma.profile.update({
                where: { id: profileId },
                data: {
                    approvedViewers: [...viewers, viewerUserId],
                },
            });

            logger.info('Viewer approved by Obhijaat member', {
                profileId,
                viewerUserId,
            });
        }
    }

    /**
     * Remove a user from approved viewers list
     */
    async revokeViewer(profileId: string, viewerUserId: string): Promise<void> {
        const profile = await prisma.profile.findUnique({
            where: { id: profileId },
            select: { approvedViewers: true },
        });

        if (!profile) {
            throw new Error('Profile not found');
        }

        const viewers = profile.approvedViewers || [];
        await prisma.profile.update({
            where: { id: profileId },
            data: {
                approvedViewers: viewers.filter(id => id !== viewerUserId),
            },
        });

        logger.info('Viewer revoked by Obhijaat member', {
            profileId,
            viewerUserId,
        });
    }
}

export const obhijaatService = new ObhijaatService();
