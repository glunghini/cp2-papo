import type { DocumentSnapshot } from 'firebase-admin/firestore';

import { GROUP_RULES, NOTIFICATION_POLICIES, type NotificationPolicy } from '../types/domain';
import { HttpError } from '../utils/httpError';
import { readNumber, readString, toStringList } from '../utils/read';
import { usersExist } from './conversationRepository';
import { database, firestore } from './firebaseAdmin';

type GroupSnapshotData = {
  ownerId: string;
  memberIds: string[];
  memberLimit: number;
};

function readGroup(snapshot: DocumentSnapshot): GroupSnapshotData {
  if (!snapshot.exists) throw new HttpError(404, 'group_not_found', 'Grupo não encontrado.');
  return {
    ownerId: readString(snapshot.get('ownerId')),
    memberIds: toStringList(snapshot.get('memberIds')),
    memberLimit: readNumber(snapshot.get('memberLimit')),
  };
}

function groupFullError(available: number): HttpError {
  const message =
    available === 0
      ? 'O grupo atingiu o limite de integrantes.'
      : `O grupo só tem ${available} ${available === 1 ? 'vaga disponível' : 'vagas disponíveis'}.`;
  return new HttpError(409, 'group_full', message);
}

/**
 * Espelha no Realtime Database a lista de integrantes do Firestore.
 * As regras do RTDB usam esse nó para liberar leitura e escrita de mensagens.
 * Sobrescreve o nó inteiro, então quem saiu do grupo perde o acesso.
 */
export async function syncMembership(groupId: string): Promise<string[]> {
  const snapshot = await firestore.collection('groups').doc(groupId).get();
  const membersRef = database.ref(`conversationMembers/${groupId}`);
  if (!snapshot.exists) {
    await membersRef.remove();
    return [];
  }
  const memberIds = toStringList(snapshot.get('memberIds'));
  await membersRef.set(Object.fromEntries(memberIds.map((uid) => [uid, true])));
  return memberIds;
}

type CreateGroupParams = {
  ownerId: string;
  name: string;
  memberIds: string[];
  memberLimit: number;
  notificationPolicy: NotificationPolicy;
};

export async function createGroup(params: CreateGroupParams): Promise<string> {
  const memberIds = Array.from(new Set([params.ownerId, ...params.memberIds]));

  if (!NOTIFICATION_POLICIES.includes(params.notificationPolicy)) {
    throw new HttpError(400, 'invalid_policy', 'Política de notificação inválida.');
  }
  if (memberIds.length < GROUP_RULES.minMembers) {
    throw new HttpError(400, 'too_few_members', 'Escolha pelo menos uma pessoa além de você.');
  }
  if (memberIds.length > params.memberLimit) {
    throw groupFullError(Math.max(params.memberLimit - 1, 0));
  }
  if (!(await usersExist(memberIds))) {
    throw new HttpError(400, 'unknown_user', 'Uma das pessoas escolhidas não tem cadastro.');
  }

  const now = Date.now();
  const ref = firestore.collection('groups').doc();
  await ref.set({
    name: params.name,
    photoUrl: '',
    ownerId: params.ownerId,
    memberIds,
    memberLimit: params.memberLimit,
    notificationPolicy: params.notificationPolicy,
    policyUpdatedBy: params.ownerId,
    policyUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  try {
    await syncMembership(ref.id);
  } catch (error) {
    // sem o espelho no RTDB ninguém conseguiria conversar; desfaz a criação
    await ref.delete().catch(() => undefined);
    throw error;
  }
  return ref.id;
}

/**
 * Adição dentro de transação: a contagem e a gravação acontecem sobre o mesmo
 * estado do documento. Duas requisições simultâneas são serializadas pelo
 * Firestore, e a segunda já enxerga as vagas consumidas pela primeira.
 */
export async function addMembers(requesterUid: string, groupId: string, newMemberIds: string[]): Promise<string[]> {
  const candidates = Array.from(new Set(newMemberIds));
  if (candidates.length === 0) throw new HttpError(400, 'no_members', 'Escolha quem será adicionado.');
  if (!(await usersExist(candidates))) {
    throw new HttpError(400, 'unknown_user', 'Uma das pessoas escolhidas não tem cadastro.');
  }

  const ref = firestore.collection('groups').doc(groupId);
  await firestore.runTransaction(async (transaction) => {
    const group = readGroup(await transaction.get(ref));
    if (group.ownerId !== requesterUid) {
      throw new HttpError(403, 'not_owner', 'Só o proprietário pode adicionar integrantes.');
    }
    const toAdd = candidates.filter((uid) => !group.memberIds.includes(uid));
    if (toAdd.length === 0) return;

    const available = group.memberLimit - group.memberIds.length;
    if (toAdd.length > available) throw groupFullError(Math.max(available, 0));

    transaction.update(ref, { memberIds: [...group.memberIds, ...toAdd], updatedAt: Date.now() });
  });

  return syncMembership(groupId);
}

export async function removeMember(requesterUid: string, groupId: string, memberId: string): Promise<string[]> {
  const ref = firestore.collection('groups').doc(groupId);
  const current = readGroup(await ref.get());

  const isOwner = current.ownerId === requesterUid;
  const isLeaving = memberId === requesterUid;
  if (!isOwner && !isLeaving) {
    throw new HttpError(403, 'not_owner', 'Só o proprietário pode remover integrantes.');
  }
  if (memberId === current.ownerId) {
    throw new HttpError(400, 'owner_cannot_leave', 'O proprietário não pode ser removido do grupo.');
  }
  if (!current.memberIds.includes(memberId)) {
    return syncMembership(groupId);
  }
  if (current.memberIds.length - 1 < GROUP_RULES.minMembers) {
    throw new HttpError(409, 'too_few_members', 'O grupo precisa ter pelo menos dois integrantes.');
  }

  // Corta o acesso às mensagens antes de mexer no Firestore. Se algo falhar
  // no meio, o pior caso é a pessoa ficar sem acesso, nunca o contrário.
  await database.ref(`conversationMembers/${groupId}/${memberId}`).remove();

  try {
    await firestore.runTransaction(async (transaction) => {
      const group = readGroup(await transaction.get(ref));
      if (group.memberIds.length - 1 < GROUP_RULES.minMembers) {
        throw new HttpError(409, 'too_few_members', 'O grupo precisa ter pelo menos dois integrantes.');
      }
      transaction.update(ref, {
        memberIds: group.memberIds.filter((uid) => uid !== memberId),
        updatedAt: Date.now(),
      });
    });
  } catch (error) {
    // devolve o acesso de acordo com o que ficou gravado no Firestore
    await syncMembership(groupId).catch(() => undefined);
    throw error;
  }

  return syncMembership(groupId);
}

export async function syncMembershipFor(requesterUid: string, groupId: string): Promise<string[]> {
  const snapshot = await firestore.collection('groups').doc(groupId).get();
  const group = readGroup(snapshot);
  if (!group.memberIds.includes(requesterUid)) {
    throw new HttpError(403, 'not_member', 'Você não participa deste grupo.');
  }
  return syncMembership(groupId);
}
