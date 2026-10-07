import {
  NOTIFICATION_POLICIES,
  type ConversationContext,
  type MessageTarget,
  type NotificationPolicy,
  type StoredMessage,
} from '../types/domain';
import { isDirectConversationId } from '../utils/ids';
import { isRecord, readNumber, readString, toStringList } from '../utils/read';
import { database, firestore } from './firebaseAdmin';

function isPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && NOTIFICATION_POLICIES.some((policy) => policy === value);
}

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

export async function loadMessage(conversationId: string, messageId: string): Promise<StoredMessage | null> {
  const snapshot = await database.ref(`messages/${conversationId}/${messageId}`).once('value');
  if (!snapshot.exists()) return null;
  const raw: unknown = snapshot.val();
  if (!isRecord(raw)) return null;

  const conversationType = raw.conversationType;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;

  return {
    id: messageId,
    conversationId,
    conversationType,
    senderId: readString(raw.senderId),
    text: readString(raw.text),
    target: parseTarget(raw.target),
    mentionedUserIds: toStringList(raw.mentionedUserIds),
    createdAt: readNumber(raw.createdAt),
  };
}

export async function loadConversation(conversationId: string): Promise<ConversationContext | null> {
  if (isDirectConversationId(conversationId)) {
    const snapshot = await firestore.collection('directConversations').doc(conversationId).get();
    if (!snapshot.exists) return null;
    const participantIds = toStringList(snapshot.get('participantIds'));
    if (participantIds.length !== 2) return null;
    return { type: 'direct', id: conversationId, participantIds };
  }

  const snapshot = await firestore.collection('groups').doc(conversationId).get();
  if (!snapshot.exists) return null;
  const policy: unknown = snapshot.get('notificationPolicy');
  return {
    type: 'group',
    id: conversationId,
    name: readString(snapshot.get('name'), 'Grupo'),
    ownerId: readString(snapshot.get('ownerId')),
    memberIds: toStringList(snapshot.get('memberIds')),
    memberLimit: readNumber(snapshot.get('memberLimit'), 0),
    notificationPolicy: isPolicy(policy) ? policy : 'all_group_messages',
  };
}

export async function loadUserName(uid: string): Promise<string> {
  const snapshot = await firestore.collection('users').doc(uid).get();
  return readString(snapshot.get('name'), 'Alguém');
}

export async function usersExist(uids: string[]): Promise<boolean> {
  if (uids.length === 0) return true;
  const refs = uids.map((uid) => firestore.collection('users').doc(uid));
  const snapshots = await firestore.getAll(...refs);
  return snapshots.every((snapshot) => snapshot.exists);
}
