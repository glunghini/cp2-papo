export const NOTIFICATION_POLICIES = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
] as const;

export type NotificationPolicy = (typeof NOTIFICATION_POLICIES)[number];

export type ConversationType = 'direct' | 'group';

export type MessageTarget =
  | { type: 'conversation' }
  | { type: 'member'; memberId: string };

export type StoredMessage = {
  id: string;
  conversationId: string;
  conversationType: ConversationType;
  senderId: string;
  text: string;
  target: MessageTarget;
  mentionedUserIds: string[];
  createdAt: number;
};

export type DirectConversationContext = {
  type: 'direct';
  id: string;
  participantIds: string[];
};

export type GroupConversationContext = {
  type: 'group';
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export type ConversationContext = DirectConversationContext | GroupConversationContext;

export const GROUP_RULES = {
  minMembers: 2,
  maxLimit: 50,
  maxNameLength: 60,
} as const;
