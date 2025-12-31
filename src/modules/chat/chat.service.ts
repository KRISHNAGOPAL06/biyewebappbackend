import { logger } from '../../utils/logger.js';
import { sanitizeMessage } from '../../utils/sanitizer.js';
import { profanityService } from './profanity.service.js';
import { profilePermissions } from '../profile/profile.permissions.js';
import { entitlementService } from '../payments/entitlement.service.js';

import {
  SaveMessageParams,
  CreateThreadParams,
  MessageResponse,
  ThreadWithPreview,
  ChatServer,
} from './chat.types.js';
import { eventBus } from '../../events/eventBus.js';

import { prisma } from '../../prisma.js';
import { ThreadParticipantResolver } from './threadParticipant.resolver.js';
// import { AIModerationService } from './aiModerationService.js';

import { maskRegisteredId } from '../../utils/mask.helper.js';
import { presenceService } from '../../utils/presence.service.js';

export class ChatService {
  private io: ChatServer | null = null;


  setSocketServer(io: ChatServer): void {
    this.io = io;
  }

  async saveMessage(params: SaveMessageParams): Promise<MessageResponse> {
    console.log("hello::::: /n\n")
    // const aiModerator = new AIModerationService(process.env.OPENAI_API_KEY!);

    const { threadId, fromUserId, toUserId, content, metadata = {} } = params;

    // Get sender's profile for entitlement check
    const senderProfile = await prisma.profile.findUnique({
      where: { userId: fromUserId },
    });

    if (senderProfile) {
      // Check if user has messaging entitlement
      let thread = threadId ? await prisma.thread.findUnique({ where: { id: threadId } }) : null;

      if (thread) {
        // Count messages in this thread from sender
        const messageCount = await prisma.message.count({
          where: { threadId, fromUserId }
        });

        const canSend = await entitlementService.can(senderProfile.id, 'send_message', { messageCount });
        if (!canSend) {
          const features = await entitlementService.getProfileFeatures(senderProfile.id);
          const messaging = features?.messaging;
          if (messaging && typeof messaging === 'object' && 'messagesPerChat' in messaging) {
            throw new Error(`MESSAGE_LIMIT_EXCEEDED: You have reached the ${messaging.messagesPerChat} messages per chat limit. Please upgrade to continue chatting.`);
          }
          throw new Error('MESSAGING_NOT_ALLOWED: Your plan does not include messaging. Please upgrade.');
        }
      }
    }

    const sanitizedContent = sanitizeMessage(content);
    let finalContent = sanitizedContent;

    // Content moderation - Block personal info sharing (phone, email, links, social media)
    const { contentModerationService } = await import('./content-moderation.service.js');
    const moderationResult = contentModerationService.moderateContent(finalContent);

    if (!moderationResult.allowed) {
      logger.warn('[Chat] Message blocked by content moderation', {
        fromUserId,
        violationType: moderationResult.violationType,
        reason: moderationResult.reason
      });
      throw new Error(`MESSAGE_BLOCKED: ${moderationResult.reason}`);
    }

    // Profanity check
    const isContentClean = profanityService.isClean(finalContent);

    if (!isContentClean) {
      metadata.moderation = 'flagged';
      metadata.reason = 'profanity';
      // Replace profane words with asterisks
      finalContent = profanityService.filter(finalContent);
    }

    let thread;
    if (threadId) {
      thread = await prisma.thread.findUnique({
        where: { id: threadId },
      });

      if (!thread) {
        throw new Error('Thread not found');
      }

      if (!thread.participants.includes(fromUserId)) {
        throw new Error('User not a participant in this thread');
      }
    } else {
      thread = await this.findOrCreateThread([fromUserId, toUserId]);
    }

    const isRecipientOnline = this.io?.sockets.adapter.rooms.has(`user:${toUserId}`) || false;

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        fromUserId,
        toUserId,
        content: finalContent,
        metadata,
        delivered: isRecipientOnline,
      },
    });

    await prisma.thread.update({
      where: { id: thread.id },
      data: { lastMsgAt: new Date() },
    });

    const messageResponse: MessageResponse = {
      id: message.id,
      threadId: message.threadId,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      content: message.content,
      metadata: message.metadata as Record<string, any> | undefined,
      delivered: message.delivered,
      read: message.read,
      createdAt: message.createdAt,
    };

    if (this.io && toUserId) {
      this.io.to(`user:${toUserId}`).emit('message', messageResponse);

      if (isRecipientOnline) {
        this.io.to(`user:${toUserId}`).emit('delivery_receipt', {
          messageId: message.id,
          threadId: thread.id,
          delivered: true,
          deliveredAt: new Date(),
        });
      } else {
        logger.info(`Recipient ${toUserId} offline, enqueue notification`);
      }
    }

    let user = await prisma.user.findUnique({ where: { id: fromUserId }, include: { profile: true } });
    // Emit notification
    console.log("🔥 EVENT EMITTED", {
      userId: toUserId,
      type: "new_message"
    });
    eventBus.emitNotification({
      userId: toUserId,
      type: "new_message",
      metadata: {
        fromName: user?.profile?.registeredUserId,
        threadId: threadId
      },
      priority: "HIGH"
    });

    return messageResponse;
  }


  async findOrCreateThread(participants: string[]): Promise<any> {
    const sortedParticipants = [...participants].sort();

    const existingThread = await prisma.thread.findFirst({
      where: {
        AND: sortedParticipants.map((participantId) => ({
          participants: {
            has: participantId,
          },
        })),
      },
    });

    if (existingThread) {
      return existingThread;
    }

    const thread = await prisma.thread.create({
      data: {
        participants: sortedParticipants,
      },
    });

    return thread;
  }

  async createThread(params: CreateThreadParams): Promise<any> {
    const { participants, effectiveUserId, metadata } = params;

    if (participants.length < 2) {
      throw new Error('Thread must have at least 2 participants');
    }

    // Use effectiveUserId if provided, otherwise use second participant (initiator)
    const initiatorId = effectiveUserId || participants[1];

    const canCreate = await this.canCreateThread(participants[0], initiatorId);
    if (!canCreate) {
      throw new Error('Users not allowed to chat. Mutual match required.');
    }

    // Check tier-based chat limit for the CURRENT USER (the one initiating the chat)
    const initiatorProfile = await prisma.profile.findUnique({
      where: { userId: initiatorId },
    });

    logger.info('[Chat] Checking chat entitlement for INITIATOR', {
      effectiveUserId: initiatorId,
      profileId: initiatorProfile?.id,
      hasProfile: !!initiatorProfile,
      metadata,
    });

    if (initiatorProfile) {
      const canStartChat = await entitlementService.can(initiatorProfile.id, 'start_chat');
      logger.info('[Chat] Entitlement check result', {
        profileId: initiatorProfile.id,
        canStartChat,
        action: 'start_chat'
      });

      if (!canStartChat) {
        const features = await entitlementService.getProfileFeatures(initiatorProfile.id);
        logger.warn('[Chat] Chat BLOCKED - checking features', {
          profileId: initiatorProfile.id,
          features: features ? JSON.stringify(features) : 'null'
        });

        const messaging = features?.messaging;
        if (messaging && typeof messaging === 'object' && 'newChatsPerMonth' in messaging) {
          throw new Error(`CHAT_LIMIT_EXCEEDED: You have reached the ${messaging.newChatsPerMonth} new chats per month limit. Please upgrade to start more conversations.`);
        }
        throw new Error('CHAT_NOT_ALLOWED: Your plan does not include messaging. Please upgrade.');
      }

      // Increment usage counter for successful chat creation
      await entitlementService.incrementUsage(initiatorProfile.id, 'start_chat');
      logger.info('[Chat] Chat creation successful, usage incremented', { profileId: initiatorProfile.id });
    } else {
      logger.warn('[Chat] No profile found for initiator, proceeding without entitlement check', { userId: effectiveUserId });
    }

    const thread = await this.findOrCreateThread(participants);
    return thread;
  }

  async getThreads(
    userId: string,
    cursor?: string,
    limit: number = 20
  ): Promise<{ threads: ThreadWithPreview[]; nextCursor: string | null }> {
    const whereClause: any = {
      participants: {
        has: userId,
      },
    };

    if (cursor) {
      const [lastMsgAt, id] = cursor.split('_');
      whereClause.OR = [
        { lastMsgAt: { lt: new Date(lastMsgAt) } },
        {
          AND: [
            { lastMsgAt: new Date(lastMsgAt) },
            { id: { lt: id } },
          ],
        },
      ];
    }

    const threads = await prisma.thread.findMany({
      where: whereClause,
      orderBy: [{ lastMsgAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const hasMore = threads.length > limit;
    const items = hasMore ? threads.slice(0, -1) : threads;

    const otherUserIds = items.map(thread =>
      thread.participants.find(id => id !== userId)!
    );

    const profileMap =
      await ThreadParticipantResolver.resolveProfilesByUserIds(otherUserIds);

    const maskedProfileMap = new Map<string, any>();

    await Promise.all(
      Array.from(profileMap.entries()).map(async ([userIdKey, profile]) => {
        if (!profile) {
          maskedProfileMap.set(userIdKey, null);
          return;
        }

        const masked = await profilePermissions.maskProfile(profile, { userId });
        if (masked) {
          (masked as any).maskedName = maskRegisteredId(masked.registeredUserId);
          (masked as any).isOnline = presenceService.isOnline(userIdKey);
        }
        maskedProfileMap.set(userIdKey, masked);
      })
    );

    // const threadsWithPreview: ThreadWithPreview[] = items.map((thread: any) => {
    //   const otherUserId = thread.participants.find((id: any) => id !== userId)!;
    //   const maskedProfiles = await Promise.all(
    //         profileMap.get(otherUserId).map((profile: any) =>
    //           profilePermissions.maskProfile(profile as any, { userId })
    //         )
    //       );
    //   return {
    //     id: thread.id,
    //     participants: thread.participants,
    //     lastMsgAt: thread.lastMsgAt,
    //     lastMessage: thread.messages[0]
    //       ? {
    //         id: thread.messages[0].id,
    //         content: thread.messages[0].content,
    //         fromUserId: thread.messages[0].fromUserId,
    //         createdAt: thread.messages[0].createdAt,
    //       }
    //       : undefined,
    //     profile: profileMap.get(otherUserId) ?? null,
    //     createdAt: thread.createdAt,
    //     updatedAt: thread.updatedAt,
    //   }
    // });

    const threadsWithPreview: ThreadWithPreview[] = items.map((thread: any) => {
      const otherUserId = thread.participants.find(
        (id: any) => id !== userId
      )!;

      if (!maskedProfileMap.has(otherUserId)) {
        console.warn(`[getThreads] Profile missing/masked for ${otherUserId}`);
      }

      return {
        id: thread.id,
        participants: thread.participants,
        lastMsgAt: thread.lastMsgAt,
        lastMessage: thread.messages[0]
          ? {
            id: thread.messages[0].id,
            content: thread.messages[0].content,
            fromUserId: thread.messages[0].fromUserId,
            createdAt: thread.messages[0].createdAt,
          }
          : undefined,
        profile: maskedProfileMap.get(otherUserId) ?? null,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
      };
    });

    const nextCursor =
      hasMore && items.length > 0
        ? `${items[items.length - 1].lastMsgAt?.toISOString()}_${items[items.length - 1].id}`
        : null;

    console.log(threadsWithPreview)

    return {
      threads: threadsWithPreview,
      nextCursor,
    };
  }

  async getThread(threadId: string, userId: string): Promise<any> {
    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new Error('Thread not found');
    }

    if (!thread.participants.includes(userId)) {
      throw new Error('User not a participant in this thread');
    }
    const otherUserId = thread.participants.find(id => id !== userId)!;

    const profileMap =
      await ThreadParticipantResolver.resolveProfilesByUserIds([otherUserId]);

    const rawProfile = profileMap.get(otherUserId);

    // 2️⃣ Mask profile (single call)
    const maskedProfile = rawProfile
      ? await profilePermissions.maskProfile(rawProfile, { userId })
      : null;

    if (maskedProfile) {
      (maskedProfile as any).maskedName = maskRegisteredId(maskedProfile.registeredUserId);
    }

    // console.log(maskedProfile);

    return {
      ...thread,
      profile: maskedProfile,
    };
  }

  async getMessages(
    threadId: string,
    userId: string,
    cursor?: string,
    limit: number = 50
  ): Promise<{ messages: MessageResponse[]; nextCursor: string | null }> {
    const thread = await this.getThread(threadId, userId);

    const whereClause: any = {
      threadId: thread.id,
    };

    if (cursor) {
      const [createdAt, id] = cursor.split('_');
      whereClause.OR = [
        { createdAt: { lt: new Date(createdAt) } },
        {
          AND: [
            { createdAt: new Date(createdAt) },
            { id: { lt: id } },
          ],
        },
      ];
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'asc' }],
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, -1) : messages;

    const messageResponses: MessageResponse[] = items.map((msg: any) => ({
      id: msg.id,
      threadId: msg.threadId,
      fromUserId: msg.fromUserId,
      toUserId: msg.toUserId,
      content: msg.content,
      metadata: msg.metadata as Record<string, any> | undefined,
      delivered: msg.delivered,
      read: msg.read,
      createdAt: msg.createdAt,
    }));

    const nextCursor =
      hasMore && items.length > 0
        ? `${items[items.length - 1].createdAt.toISOString()}_${items[items.length - 1].id}`
        : null;

    return {
      messages: messageResponses,
      nextCursor,
    };
  }

  async markAsRead(
    threadId: string,
    userId: string,
    uptoMessageId?: string
  ): Promise<void> {
    const thread = await this.getThread(threadId, userId);

    const whereClause: any = {
      threadId: thread.id,
      toUserId: userId,
      read: false,
    };

    if (uptoMessageId) {
      const message = await prisma.message.findUnique({
        where: { id: uptoMessageId },
      });

      if (message) {
        whereClause.createdAt = { lte: message.createdAt };
      }
    }

    const updatedMessages = await prisma.message.updateMany({
      where: whereClause,
      data: { read: true },
    });

    if (updatedMessages.count > 0 && this.io) {
      const otherParticipants = thread.participants.filter((p: string) => p !== userId);
      otherParticipants.forEach((participantId: string) => {
        this.io?.to(`user:${participantId}`).emit('read_receipt', {
          messageId: uptoMessageId || 'multiple',
          threadId,
          userId,
          readAt: new Date(),
        });
      });
    }

    logger.info(`Marked ${updatedMessages.count} messages as read in thread ${threadId} for user ${userId}`);
  }

  async canCreateThread(userA: string, userB: string): Promise<boolean> {
    const mutualMatch = await prisma.interest.findFirst({
      where: {
        OR: [
          {
            AND: [
              { fromUserId: userA, toUserId: userB, status: 'accepted' },
            ],
          },
          {
            AND: [
              { fromUserId: userB, toUserId: userA, status: 'accepted' },
            ],
          },
        ],
      },
    });

    // if (mutualMatch) {
    //   const reverseMatch = await prisma.interest.findFirst({
    //     where: {
    //       fromUserId: mutualMatch.toUserId,
    //       toUserId: mutualMatch.fromUserId,
    //       status: 'accepted',
    //     },
    //   });

    //   return !!reverseMatch;
    // }

    return !!mutualMatch;
  }

  async canUserChat(userA: string, userB: string): Promise<boolean> {
    return this.canCreateThread(userA, userB);
  }
}

export const chatService = new ChatService();
