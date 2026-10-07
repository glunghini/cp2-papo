import type { ChatGroup } from './group';

export type ConversationType = 'direct' | 'group';

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type ChatMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type DirectConversation = {
  id: string;
  type: 'direct';
  participants: [string, string];
  createdAt: number;
};

export type ConversationListItem =
  | { type: 'direct'; id: string; createdAt: number; otherUserId: string }
  | { type: 'group'; id: string; createdAt: number; group: ChatGroup };

export type OutgoingMessage = {
  text: string;
  mentionedUserIds: string[];
  target: MessageTarget;
};

export type FailedMessage = OutgoingMessage & {
  reason: string;
};
