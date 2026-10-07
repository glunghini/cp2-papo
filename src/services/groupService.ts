import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  updateDoc,
  where,
  type DocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';

import type {
  ChatGroup,
  CreateGroupInput,
  GroupSettingsChanges,
  NotificationPolicy,
} from '../types/group';
import { AppError } from '../utils/errors';
import { validateGroupName, validateMemberCount, validateMemberLimit } from '../utils/groupValidation';
import { isRecord, readNumber, readString, toStringList, type UnknownRecord } from '../utils/parse';
import { apiRequest } from './apiClient';
import { firestore } from './firebase';
import { uploadGroupPhoto } from './storageService';

const POLICIES: readonly NotificationPolicy[] = [
  'all_group_messages',
  'mentioned_members',
  'direct_messages_only',
  'disabled',
];

export function isNotificationPolicy(value: unknown): value is NotificationPolicy {
  return typeof value === 'string' && POLICIES.some((policy) => policy === value);
}

export function parseGroup(snapshot: DocumentSnapshot): ChatGroup | null {
  if (!snapshot.exists()) return null;
  const data: UnknownRecord = snapshot.data();
  const policy = isNotificationPolicy(data.notificationPolicy) ? data.notificationPolicy : 'all_group_messages';
  return {
    id: snapshot.id,
    name: readString(data, 'name', 'Grupo'),
    photoUrl: readString(data, 'photoUrl'),
    ownerId: readString(data, 'ownerId'),
    memberIds: toStringList(data.memberIds),
    memberLimit: readNumber(data, 'memberLimit', 2),
    notificationPolicy: policy,
    policyUpdatedBy: readString(data, 'policyUpdatedBy'),
    policyUpdatedAt: readNumber(data, 'policyUpdatedAt'),
    createdAt: readNumber(data, 'createdAt'),
    updatedAt: readNumber(data, 'updatedAt'),
  };
}

export function subscribeToUserGroups(
  uid: string,
  onChange: (groups: ChatGroup[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const groupsQuery = query(collection(firestore, 'groups'), where('memberIds', 'array-contains', uid));
  return onSnapshot(
    groupsQuery,
    (snapshot) => {
      const groups = snapshot.docs
        .map((item) => parseGroup(item))
        .filter((group): group is ChatGroup => group !== null);
      onChange(groups);
    },
    onError,
  );
}

export function subscribeToGroup(
  groupId: string,
  onChange: (group: ChatGroup | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(doc(firestore, 'groups', groupId), (snapshot) => onChange(parseGroup(snapshot)), onError);
}

type CreateGroupResult = {
  groupId: string;
  photoUploadFailed: boolean;
};

/**
 * A criação passa pela API porque ela grava o grupo no Firestore e, na mesma
 * operação, libera o acesso dos integrantes às mensagens no Realtime Database.
 */
export async function createGroup(input: CreateGroupInput, ownerUid: string): Promise<CreateGroupResult> {
  const memberIds = Array.from(new Set([ownerUid, ...input.memberIds]));
  const validation =
    validateGroupName(input.name) ??
    validateMemberCount(memberIds.length) ??
    validateMemberLimit(String(input.memberLimit), memberIds.length);
  if (validation) throw new AppError(validation);

  const response = await apiRequest('/groups', {
    method: 'POST',
    body: {
      name: input.name.trim(),
      memberIds: memberIds.filter((id) => id !== ownerUid),
      memberLimit: input.memberLimit,
      notificationPolicy: input.notificationPolicy,
    },
  });

  if (!isRecord(response) || typeof response.groupId !== 'string') {
    throw new AppError('O servidor não confirmou a criação do grupo.');
  }

  const groupId = response.groupId;
  let photoUploadFailed = false;
  if (input.photoUri) {
    try {
      await updateGroupPhoto(groupId, input.photoUri);
    } catch {
      photoUploadFailed = true;
    }
  }
  return { groupId, photoUploadFailed };
}

type GroupUpdate = Partial<
  Pick<ChatGroup, 'name' | 'memberLimit' | 'notificationPolicy' | 'policyUpdatedBy' | 'policyUpdatedAt'>
> & { updatedAt: number };

/**
 * Nome, limite e política mudam direto no Firestore, dentro de uma transação.
 * As regras repetem as mesmas validações, então um cliente adulterado não passa.
 */
export async function updateGroupSettings(
  groupId: string,
  currentUid: string,
  changes: GroupSettingsChanges,
): Promise<void> {
  const groupRef = doc(firestore, 'groups', groupId);

  await runTransaction(firestore, async (transaction) => {
    const group = parseGroup(await transaction.get(groupRef));
    if (!group) throw new AppError('Este grupo não existe mais.');
    if (group.ownerId !== currentUid) throw new AppError('Só o proprietário pode alterar o grupo.');

    const now = Date.now();
    const update: GroupUpdate = { updatedAt: now };

    if (changes.name !== undefined) {
      const error = validateGroupName(changes.name);
      if (error) throw new AppError(error);
      update.name = changes.name.trim();
    }

    if (changes.memberLimit !== undefined) {
      const error = validateMemberLimit(String(changes.memberLimit), group.memberIds.length);
      if (error) throw new AppError(error);
      update.memberLimit = changes.memberLimit;
    }

    if (changes.notificationPolicy !== undefined && changes.notificationPolicy !== group.notificationPolicy) {
      update.notificationPolicy = changes.notificationPolicy;
      update.policyUpdatedBy = currentUid;
      update.policyUpdatedAt = now;
    }

    transaction.update(groupRef, update);
  });
}

export async function updateGroupPhoto(groupId: string, localUri: string): Promise<void> {
  const photoUrl = await uploadGroupPhoto(groupId, localUri);
  await updateDoc(doc(firestore, 'groups', groupId), { photoUrl, updatedAt: Date.now() });
}

export async function addGroupMembers(groupId: string, memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) return;
  await apiRequest(`/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    body: { memberIds },
  });
}

export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  await apiRequest(
    `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
    { method: 'DELETE' },
  );
}

/** Reaplica no Realtime Database a lista de integrantes que está no Firestore. */
export async function syncGroupMembership(groupId: string): Promise<void> {
  await apiRequest(`/groups/${encodeURIComponent(groupId)}/sync`, { method: 'POST' });
}
