import type { ConversationContext, MessageTarget } from '../types/domain';

export type MessageForResolution = {
  senderId: string;
  target: MessageTarget;
  mentionedUserIds: string[];
};

export type RecipientReason = 'direct' | 'group' | 'mention';

export type Recipient = {
  uid: string;
  reason: RecipientReason;
};

function participantsOf(conversation: ConversationContext): string[] {
  return conversation.type === 'direct' ? conversation.participantIds : conversation.memberIds;
}

/**
 * Decide quem recebe push de uma mensagem. Função pura: recebe só dados que a API
 * leu do Firebase, nunca uma lista enviada pelo aplicativo.
 */
export function resolveRecipients(conversation: ConversationContext, message: MessageForResolution): Recipient[] {
  const participants = Array.from(new Set(participantsOf(conversation)));

  // remetente que não participa (ou foi removido) não dispara nada
  if (!participants.includes(message.senderId)) return [];

  const others = participants.filter((uid) => uid !== message.senderId);

  if (conversation.type === 'direct') {
    return others.map((uid) => ({ uid, reason: 'direct' }));
  }

  // menções e destinatário explícito só valem para quem ainda é integrante
  const addressed = new Set<string>(message.mentionedUserIds);
  if (message.target.type === 'member') addressed.add(message.target.memberId);

  switch (conversation.notificationPolicy) {
    case 'all_group_messages':
      return others.map((uid) => ({ uid, reason: addressed.has(uid) ? 'mention' : 'group' }));
    case 'mentioned_members':
      return others.filter((uid) => addressed.has(uid)).map((uid) => ({ uid, reason: 'mention' }));
    case 'direct_messages_only':
    case 'disabled':
      return [];
    default: {
      const exhaustive: never = conversation.notificationPolicy;
      return exhaustive;
    }
  }
}
