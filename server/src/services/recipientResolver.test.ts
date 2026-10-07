import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { GroupConversationContext, NotificationPolicy } from '../types/domain';
import { resolveRecipients, type MessageForResolution } from './recipientResolver';

function group(policy: NotificationPolicy, memberIds = ['ana', 'bia', 'caio', 'duda']): GroupConversationContext {
  return {
    type: 'group',
    id: 'g1',
    name: 'Grupo',
    ownerId: 'ana',
    memberIds,
    memberLimit: 5,
    notificationPolicy: policy,
  };
}

const general: MessageForResolution = { senderId: 'ana', target: { type: 'conversation' }, mentionedUserIds: [] };
const toCaio: MessageForResolution = {
  senderId: 'ana',
  target: { type: 'member', memberId: 'caio' },
  mentionedUserIds: ['caio'],
};

const uids = (list: { uid: string }[]) => list.map((item) => item.uid).sort();

describe('resolveRecipients', () => {
  it('conversa individual notifica só o outro participante', () => {
    const result = resolveRecipients({ type: 'direct', id: 'direct_a_b', participantIds: ['a', 'b'] }, {
      senderId: 'a',
      target: { type: 'conversation' },
      mentionedUserIds: [],
    });
    assert.deepEqual(uids(result), ['b']);
  });

  it('all_group_messages notifica todos menos o remetente', () => {
    assert.deepEqual(uids(resolveRecipients(group('all_group_messages'), general)), ['bia', 'caio', 'duda']);
  });

  it('all_group_messages marca quem foi mencionado', () => {
    const result = resolveRecipients(group('all_group_messages'), toCaio);
    assert.equal(result.find((item) => item.uid === 'caio')?.reason, 'mention');
    assert.equal(result.find((item) => item.uid === 'bia')?.reason, 'group');
  });

  it('mentioned_members notifica só os mencionados', () => {
    assert.deepEqual(uids(resolveRecipients(group('mentioned_members'), toCaio)), ['caio']);
    assert.deepEqual(uids(resolveRecipients(group('mentioned_members'), general)), []);
  });

  it('direct_messages_only e disabled não notificam mensagens de grupo', () => {
    assert.deepEqual(resolveRecipients(group('direct_messages_only'), toCaio), []);
    assert.deepEqual(resolveRecipients(group('disabled'), toCaio), []);
  });

  it('ignora menção a quem não é mais integrante', () => {
    const message: MessageForResolution = { senderId: 'ana', target: { type: 'conversation' }, mentionedUserIds: ['zeca'] };
    assert.deepEqual(uids(resolveRecipients(group('mentioned_members'), message)), []);
  });

  it('remetente fora do grupo não gera push', () => {
    const message: MessageForResolution = { ...general, senderId: 'zeca' };
    assert.deepEqual(resolveRecipients(group('all_group_messages'), message), []);
  });

  it('o remetente nunca recebe a própria mensagem, mesmo se mencionado', () => {
    const message: MessageForResolution = { senderId: 'ana', target: { type: 'conversation' }, mentionedUserIds: ['ana', 'bia'] };
    assert.deepEqual(uids(resolveRecipients(group('mentioned_members'), message)), ['bia']);
  });
});
