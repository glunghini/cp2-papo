import type { ConversationContext } from '../types/domain';
import { HttpError } from '../utils/httpError';
import { loadConversation, loadMessage, loadUserName } from './conversationRepository';
import { disableDevices, loadEnabledDevices } from './deviceRepository';
import { acquireDispatchLock, completeDispatch, failDispatch } from './dispatchLock';
import { sendPushNotifications, type PushTarget } from './notificationSender';
import { resolveRecipients, type RecipientReason } from './recipientResolver';

// Pedidos de push para mensagens antigas são ignorados (evita reenvio tardio)
const MESSAGE_MAX_AGE_MS = 10 * 60 * 1000;

export type DispatchResult = {
  status: 'sent' | 'skipped' | 'duplicate';
  recipients: number;
  delivered: number;
  reason?: string;
};

type NotifyParams = {
  conversationId: string;
  messageId: string;
  requesterUid: string;
};

function isParticipant(conversation: ConversationContext, uid: string): boolean {
  return conversation.type === 'direct'
    ? conversation.participantIds.includes(uid)
    : conversation.memberIds.includes(uid);
}

/** Texto curto, sem o conteúdo da mensagem: a tela bloqueada não deve expor a conversa. */
function buildContent(conversation: ConversationContext, senderName: string, reason: RecipientReason) {
  if (conversation.type === 'direct') {
    return { title: senderName, body: 'Enviou uma nova mensagem.' };
  }
  return {
    title: conversation.name,
    body: reason === 'mention' ? `${senderName} mencionou você.` : `${senderName} enviou uma mensagem.`,
  };
}

export async function notifyMessage({ conversationId, messageId, requesterUid }: NotifyParams): Promise<DispatchResult> {
  // 1. a mensagem existe no Realtime Database e foi escrita por quem está pedindo
  const message = await loadMessage(conversationId, messageId);
  if (!message) throw new HttpError(404, 'message_not_found', 'Mensagem não encontrada.');
  if (message.senderId !== requesterUid) {
    throw new HttpError(403, 'not_sender', 'Só quem enviou a mensagem pode pedir a notificação.');
  }

  // 2. a conversa existe no Firestore e o remetente ainda participa dela
  const conversation = await loadConversation(conversationId);
  if (!conversation) throw new HttpError(404, 'conversation_not_found', 'Conversa não encontrada.');
  if (conversation.type !== message.conversationType) {
    throw new HttpError(400, 'type_mismatch', 'O tipo da mensagem não corresponde ao da conversa.');
  }
  if (!isParticipant(conversation, requesterUid)) {
    throw new HttpError(403, 'not_participant', 'Você não participa desta conversa.');
  }

  if (Date.now() - message.createdAt > MESSAGE_MAX_AGE_MS) {
    return { status: 'skipped', recipients: 0, delivered: 0, reason: 'message_too_old' };
  }

  // 3. trava de idempotência: a mesma mensagem não notifica duas vezes
  const lock = await acquireDispatchLock(conversationId, messageId, requesterUid);
  if (!lock.acquired) return { status: 'duplicate', recipients: 0, delivered: 0 };

  try {
    // 4. destinatários calculados aqui, a partir da política salva no Firestore
    const recipients = resolveRecipients(conversation, message);
    if (recipients.length === 0) {
      await completeDispatch(lock.ref, { status: 'skipped', recipients: 0, devices: 0, delivered: 0 });
      return { status: 'skipped', recipients: 0, delivered: 0, reason: 'policy' };
    }

    const [senderName, devices, senderDevices] = await Promise.all([
      loadUserName(requesterUid),
      loadEnabledDevices(recipients.map((recipient) => recipient.uid)),
      loadEnabledDevices([requesterUid]),
    ]);

    // Se o aparelho do remetente ainda estiver registrado em outra conta, ele fica de fora
    const senderTokens = new Set(senderDevices.map((device) => device.token));
    const reasonByUid = new Map(recipients.map((recipient) => [recipient.uid, recipient.reason]));
    const seenTokens = new Set<string>();

    const targets: PushTarget[] = [];
    devices.forEach((device) => {
      if (senderTokens.has(device.token) || seenTokens.has(device.token)) return;
      seenTokens.add(device.token);
      const content = buildContent(conversation, senderName, reasonByUid.get(device.uid) ?? 'group');
      targets.push({
        devicePath: device.path,
        token: device.token,
        ...content,
        data: { conversationId, conversationType: conversation.type, messageId },
      });
    });

    const outcome =
      targets.length > 0 ? await sendPushNotifications(targets) : { accepted: 0, failed: 0, invalidDevicePaths: [] };
    await disableDevices(outcome.invalidDevicePaths);

    await completeDispatch(lock.ref, {
      status: 'sent',
      recipients: recipients.length,
      devices: targets.length,
      delivered: outcome.accepted,
    });
    return { status: 'sent', recipients: recipients.length, delivered: outcome.accepted };
  } catch (error) {
    await failDispatch(lock.ref, error).catch(() => undefined);
    throw error;
  }
}
