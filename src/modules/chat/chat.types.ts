import { Server, Socket } from 'socket.io';

export interface ChatGatewayOptions {
  redisOptions?: {
    host: string;
    port: number;
    password?: string;
  };
  enableRedisAdapter?: boolean;
}

export interface SocketData {
  userId: string;
  sessionId?: string;
}

export interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

export interface PrivateMessagePayload {
  threadId?: string;
  toUserId: string;
  content: string;
  metadata?: Record<string, any>;
  tempId?: string;
}

export interface MessageResponse {
  id: string;
  threadId: string;
  fromUserId: string;
  toUserId: string | null;
  content: string;
  metadata?: Record<string, any>;
  delivered: boolean;
  read: boolean;
  createdAt: Date;
  tempId?: string;
}

export interface ThreadWithPreview {
  id: string;
  participants: string[];
  lastMsgAt: Date | null;
  lastMessage?: {
    id: string;
    content: string;
    fromUserId: string;
    createdAt: Date;
  };
  profile: any,
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryReceipt {
  messageId: string;
  threadId: string;
  delivered: boolean;
  deliveredAt: Date;
}

export interface ReadReceipt {
  messageId: string;
  threadId: string;
  userId: string;
  readAt: Date;
}

export interface SaveMessageParams {
  threadId?: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  metadata?: Record<string, any>;
}

export interface CreateThreadParams {
  participants: string[];
  effectiveUserId?: string;
  metadata?: Record<string, any>;
}

export interface ChatEvents {
  private_message: (payload: PrivateMessagePayload) => void;
  message: (message: MessageResponse) => void;
  delivery_receipt: (receipt: DeliveryReceipt) => void;
  read_receipt: (receipt: ReadReceipt) => void;
  rate_limited: () => void;
  error: (error: { message: string; code?: string; tempId?: string }) => void;
  ping: () => void;
  pong: () => void;
}

export interface ServerToClientEvents extends ChatEvents { }
export interface ClientToServerEvents extends ChatEvents { }

export type ChatServer = Server<ClientToServerEvents, ServerToClientEvents>;
