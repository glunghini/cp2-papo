const DIRECT_PREFIX = 'direct_';

/**
 * O id da conversa individual é derivado dos dois uids em ordem.
 * Assim o mesmo par sempre cai no mesmo documento e não existe conversa duplicada.
 */
export function buildDirectConversationId(uidA: string, uidB: string): string {
  if (uidA === uidB) {
    throw new Error('Uma conversa individual precisa de dois usuários diferentes.');
  }
  const [first, second] = [uidA, uidB].sort();
  return `${DIRECT_PREFIX}${first}_${second}`;
}

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.startsWith(DIRECT_PREFIX);
}

export function getDirectParticipants(conversationId: string): [string, string] | null {
  if (!isDirectConversationId(conversationId)) return null;
  const parts = conversationId.slice(DIRECT_PREFIX.length).split('_');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export function getOtherParticipant(conversationId: string, currentUid: string): string | null {
  const participants = getDirectParticipants(conversationId);
  if (!participants || !participants.includes(currentUid)) return null;
  return participants[0] === currentUid ? participants[1] : participants[0];
}
