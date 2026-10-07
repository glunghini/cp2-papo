import {
  limitToLast,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  serverTimestamp,
  set,
} from 'firebase/database';
import {
  collection,
  doc,
  onSnapshot,
  query as firestoreQuery,
  runTransaction,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import type {
  ChatMessage,
  ConversationType,
  DirectConversation,
  MessageTarget,
  OutgoingMessage,
} from '../types/chat';
import type { PushDispatchResponse } from '../types/notification';
import { buildDirectConversationId } from '../utils/conversationId';
import { AppError } from '../utils/errors';
import { isRecord, readNumber, readString, toStringList, type UnknownRecord } from '../utils/parse';
import { apiRequest } from './apiClient';
import { database, firestore } from './firebase';

export const MESSAGE_MAX_LENGTH = 2000;

// ---------- conversas individuais (metadados no Firestore) ----------

export async function getOrCreateDirectConversation(currentUid: string, otherUid: string): Promise<string> {
  if (currentUid === otherUid) {
    throw new AppError('Você não pode abrir uma conversa com você mesmo.');
  }
  const conversationId = buildDirectConversationId(currentUid, otherUid);
  const participantIds = [currentUid, otherUid].sort();
  const conversationRef = doc(firestore, 'directConversations', conversationId);

  await runTransaction(firestore, async (transaction) => {
    const snapshot = await transaction.get(conversationRef);
    if (!snapshot.exists()) {
      transaction.set(conversationRef, { participantIds, createdAt: Date.now() });
    }
  });

  return conversationId;
}

function parseDirectConversation(id: string, data: UnknownRecord): DirectConversation | null {
  const participants = toStringList(data.participantIds);
  const [first, second] = participants;
  if (participants.length !== 2 || !first || !second) return null;
  return { id, type: 'direct', participants: [first, second], createdAt: readNumber(data, 'createdAt') };
}

export function subscribeToDirectConversations(
  uid: string,
  onChange: (conversations: DirectConversation[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const conversationsQuery = firestoreQuery(
    collection(firestore, 'directConversations'),
    where('participantIds', 'array-contains', uid),
  );
  return onSnapshot(
    conversationsQuery,
    (snapshot) => {
      const conversations = snapshot.docs
        .map((item) => parseDirectConversation(item.id, item.data()))
        .filter((item): item is DirectConversation => item !== null);
      onChange(conversations);
    },
    onError,
  );
}

// ---------- mensagens (Realtime Database) ----------

function parseTarget(value: unknown): MessageTarget {
  if (isRecord(value) && value.type === 'member' && typeof value.memberId === 'string') {
    return { type: 'member', memberId: value.memberId };
  }
  return { type: 'conversation' };
}

function parseConversationType(value: unknown): ConversationType | null {
  return value === 'direct' || value === 'group' ? value : null;
}

export function parseMessage(id: string, raw: unknown): ChatMessage | null {
  if (!isRecord(raw)) return null;
  const conversationType = parseConversationType(raw.conversationType);
  const senderId = readString(raw, 'senderId');
  const text = readString(raw, 'text');
  if (!conversationType || !senderId || !text) return null;

  return {
    id,
    conversationId: readString(raw, 'conversationId'),
    conversationType,
    senderId,
    text,
    target: parseTarget(raw.target),
    mentionedUserIds: toStringList(raw.mentionedUserIds),
    createdAt: readNumber(raw, 'createdAt', Date.now()),
  };
}

export function subscribeToMessages(
  conversationId: string,
  pageSize: number,
  onChange: (messages: ChatMessage[]) => void,
  onError: (error: Error) => void,
): () => void {
  const messagesQuery = query(
    ref(database, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(pageSize),
  );

  return onValue(
    messagesQuery,
    (snapshot) => {
      const messages: ChatMessage[] = [];
      snapshot.forEach((child) => {
        const parsed = child.key ? parseMessage(child.key, child.val()) : null;
        if (parsed) messages.push(parsed);
      });
      onChange(messages);
    },
    onError,
  );
}

export function subscribeToLastMessage(
  conversationId: string,
  onChange: (message: ChatMessage | null) => void,
  onError: (error: Error) => void,
): () => void {
  const lastQuery = query(
    ref(database, `messages/${conversationId}`),
    orderByChild('createdAt'),
    limitToLast(1),
  );
  return onValue(
    lastQuery,
    (snapshot) => {
      let last: ChatMessage | null = null;
      snapshot.forEach((child) => {
        last = child.key ? parseMessage(child.key, child.val()) : null;
      });
      onChange(last);
    },
    onError,
  );
}

export function subscribeToConnection(onChange: (connected: boolean) => void): () => void {
  return onValue(ref(database, '.info/connected'), (snapshot) => onChange(snapshot.val() === true));
}

/** Gera o id da mensagem antes de gravar, para a tela marcar a mensagem como pendente. */
export function createMessageId(conversationId: string): string {
  const key = push(ref(database, `messages/${conversationId}`)).key;
  if (!key) throw new AppError('Não foi possível preparar a mensagem.');
  return key;
}

type WriteMessageParams = {
  conversationId: string;
  conversationType: ConversationType;
  messageId: string;
  senderId: string;
  message: OutgoingMessage;
};

export async function writeMessage({
  conversationId,
  conversationType,
  messageId,
  senderId,
  message,
}: WriteMessageParams): Promise<void> {
  const text = message.text.trim();
  if (text.length === 0) throw new AppError('Escreva alguma coisa antes de enviar.');
  if (text.length > MESSAGE_MAX_LENGTH) {
    throw new AppError(`A mensagem pode ter até ${MESSAGE_MAX_LENGTH} caracteres.`);
  }

  await set(ref(database, `messages/${conversationId}/${messageId}`), {
    conversationId,
    conversationType,
    senderId,
    text,
    target: message.target,
    mentionedUserIds: message.mentionedUserIds,
    createdAt: serverTimestamp(),
  });
}

function parseDispatchResponse(value: unknown): PushDispatchResponse {
  if (!isRecord(value)) return { status: 'skipped', recipients: 0, delivered: 0 };
  const status = value.status === 'sent' || value.status === 'duplicate' ? value.status : 'skipped';
  return {
    status,
    recipients: readNumber(value, 'recipients'),
    delivered: readNumber(value, 'delivered'),
  };
}

/** A API valida remetente, participantes e política antes de disparar o push. */
export async function requestPushForMessage(
  conversationId: string,
  messageId: string,
): Promise<PushDispatchResponse> {
  const response = await apiRequest('/notifications/messages', {
    method: 'POST',
    body: { conversationId, messageId },
  });
  return parseDispatchResponse(response);
}
