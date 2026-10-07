import type { ConversationType } from './chat';
import type { NotificationPolicy } from './group';

export type NotificationSettings = {
  conversationId: string;
  policy: NotificationPolicy;
  updatedBy: string;
  updatedAt: number;
};

export type DevicePlatform = 'ios' | 'android';

export type DeviceRegistration = {
  token: string;
  platform: DevicePlatform;
  enabled: boolean;
  updatedAt: number;
};

export type PushRegistrationStatus =
  | 'idle'
  | 'registering'
  | 'registered'
  | 'denied'
  | 'unavailable'
  | 'error';

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'denied' }
  | { status: 'unavailable'; reason: string }
  | { status: 'error'; reason: string };

export type ChatNotificationData = {
  conversationId: string;
  conversationType: ConversationType;
  messageId: string | null;
};

export type PushDispatchResponse = {
  status: 'sent' | 'skipped' | 'duplicate';
  recipients: number;
  delivered: number;
};
