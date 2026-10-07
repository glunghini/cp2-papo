import { z } from 'zod';

const DIRECT_PREFIX = 'direct_';

// Ids entram em caminhos do Realtime Database; nada de "/", "." ou "$".
export const uidSchema = z.string().regex(/^[A-Za-z0-9]{1,128}$/, 'Identificador de usuário inválido.');
export const groupIdSchema = z.string().regex(/^[A-Za-z0-9]{1,64}$/, 'Identificador de grupo inválido.');
export const messageIdSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, 'Identificador de mensagem inválido.');
export const conversationIdSchema = z
  .string()
  .regex(/^(direct_[A-Za-z0-9]+_[A-Za-z0-9]+|[A-Za-z0-9]{1,64})$/, 'Identificador de conversa inválido.');

export function isDirectConversationId(conversationId: string): boolean {
  return conversationId.startsWith(DIRECT_PREFIX);
}

export function buildDirectConversationId(uidA: string, uidB: string): string {
  const [first, second] = [uidA, uidB].sort();
  return `${DIRECT_PREFIX}${first}_${second}`;
}
