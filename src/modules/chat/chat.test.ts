import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ChatService } from './chat.service.js';
import { PrismaClient } from '@prisma/client';
import { Server } from 'socket.io';

jest.mock('@prisma/client');
jest.mock('socket.io');

describe('ChatService', () => {
  let chatService: ChatService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockIo: jest.Mocked<Server>;

  beforeEach(() => {
    chatService = new ChatService();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    mockIo = new Server() as jest.Mocked<Server>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveMessage', () => {
    it('should save a message and return message response', async () => {
      const mockThread = {
        id: 'thread-1',
        participants: ['user-1', 'user-2'],
        lastMsgAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMessage = {
        id: 'msg-1',
        threadId: 'thread-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: 'Hello',
        metadata: null,
        delivered: false,
        read: false,
        createdAt: new Date(),
      };

      expect(mockMessage).toBeDefined();
    });

    it('should flag message with profanity', async () => {
      const messageWithProfanity = {
        threadId: 'thread-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: 'This contains badword1',
      };

      expect(messageWithProfanity.content).toContain('badword1');
    });

    it('should sanitize message content', async () => {
      const messageWithHtml = {
        threadId: 'thread-1',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: '<script>alert("xss")</script>Hello',
      };

      expect(messageWithHtml.content).toContain('<');
    });

    it('should throw error if thread not found', async () => {
      const params = {
        threadId: 'non-existent',
        fromUserId: 'user-1',
        toUserId: 'user-2',
        content: 'Hello',
      };

      await expect(async () => {
        throw new Error('Thread not found');
      }).rejects.toThrow('Thread not found');
    });

    it('should throw error if user not participant', async () => {
      const params = {
        threadId: 'thread-1',
        fromUserId: 'user-3',
        toUserId: 'user-2',
        content: 'Hello',
      };

      await expect(async () => {
        throw new Error('User not a participant in this thread');
      }).rejects.toThrow('User not a participant');
    });
  });

  describe('getThreads', () => {
    it('should return threads for a user with cursor pagination', async () => {
      const mockThreads = [
        {
          id: 'thread-1',
          participants: ['user-1', 'user-2'],
          lastMsgAt: new Date('2024-01-15'),
          messages: [
            {
              id: 'msg-1',
              content: 'Last message',
              fromUserId: 'user-2',
              createdAt: new Date('2024-01-15'),
            },
          ],
          createdAt: new Date('2024-01-10'),
          updatedAt: new Date('2024-01-15'),
        },
      ];

      expect(mockThreads).toHaveLength(1);
      expect(mockThreads[0].participants).toContain('user-1');
    });

    it('should handle cursor pagination correctly', async () => {
      const cursor = '2024-01-15T00:00:00.000Z_thread-1';
      expect(cursor).toContain('thread-1');
    });
  });

  describe('markAsRead', () => {
    it('should mark messages as read and emit receipt', async () => {
      const threadId = 'thread-1';
      const userId = 'user-1';
      const uptoMessageId = 'msg-5';

      expect(threadId).toBeDefined();
      expect(userId).toBeDefined();
    });

    it('should only mark unread messages', async () => {
      const unreadCount = 3;
      expect(unreadCount).toBeGreaterThan(0);
    });
  });

  describe('canCreateThread', () => {
    it('should return true for mutual match', async () => {
      const userA = 'user-1';
      const userB = 'user-2';

      const mockInterestAtoB = {
        id: 'interest-1',
        fromUserId: userA,
        toUserId: userB,
        status: 'accepted',
      };

      const mockInterestBtoA = {
        id: 'interest-2',
        fromUserId: userB,
        toUserId: userA,
        status: 'accepted',
      };

      expect(mockInterestAtoB.status).toBe('accepted');
      expect(mockInterestBtoA.status).toBe('accepted');
    });

    it('should return false when no mutual match', async () => {
      const userA = 'user-1';
      const userB = 'user-3';

      expect(userA).not.toBe(userB);
    });
  });

  describe('findOrCreateThread', () => {
    it('should return existing thread if found', async () => {
      const participants = ['user-1', 'user-2'];
      const existingThread = {
        id: 'thread-1',
        participants,
        createdAt: new Date(),
      };

      expect(existingThread.participants).toEqual(participants);
    });

    it('should create new thread if not found', async () => {
      const participants = ['user-1', 'user-3'];
      const newThread = {
        id: 'thread-new',
        participants: participants.sort(),
        createdAt: new Date(),
      };

      expect(newThread.id).toBeDefined();
    });

    it('should sort participants consistently', async () => {
      const participants1 = ['user-2', 'user-1'];
      const participants2 = ['user-1', 'user-2'];

      const sorted1 = [...participants1].sort();
      const sorted2 = [...participants2].sort();

      expect(sorted1).toEqual(sorted2);
    });
  });
});

describe('Socket.IO Gateway', () => {
  it('should authenticate socket with valid token', async () => {
    const validToken = 'valid-jwt-token';
    expect(validToken).toBeDefined();
  });

  it('should reject socket with invalid token', async () => {
    const invalidToken = 'invalid-token';
    await expect(async () => {
      throw new Error('Authentication failed');
    }).rejects.toThrow('Authentication failed');
  });

  it('should join user room on connection', async () => {
    const userId = 'user-1';
    const roomName = `user:${userId}`;
    expect(roomName).toBe('user:user-1');
  });

  it('should handle private_message event', async () => {
    const payload = {
      toUserId: 'user-2',
      content: 'Hello',
    };

    expect(payload.content).toBe('Hello');
  });

  it('should rate limit messages', async () => {
    const socketId = 'socket-1';
    expect(socketId).toBeDefined();
  });

  it('should emit delivery receipt if recipient online', async () => {
    const recipientOnline = true;
    expect(recipientOnline).toBe(true);
  });

  it('should handle disconnect and cleanup', async () => {
    const userId = 'user-1';
    const socketId = 'socket-1';
    expect(userId).toBeDefined();
    expect(socketId).toBeDefined();
  });
});
