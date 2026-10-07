import { useEffect, useState } from 'react';

import { subscribeToGroup, subscribeToUserGroups } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { getErrorMessage, isPermissionDenied } from '../utils/errors';

export function useUserGroups(uid: string) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    return subscribeToUserGroups(
      uid,
      (list) => {
        setGroups(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err, 'Não foi possível carregar seus grupos.'));
        setLoading(false);
      },
    );
  }, [uid]);

  return { groups, loading, error };
}

/**
 * Acompanha um grupo em tempo real. Se o usuário for removido, a regra do
 * Firestore passa a negar a leitura e o hook sinaliza accessLost.
 */
export function useGroup(groupId: string | null, currentUid: string) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(groupId !== null);
  const [error, setError] = useState<string | null>(null);
  const [accessLost, setAccessLost] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    setAccessLost(false);
    return subscribeToGroup(
      groupId,
      (data) => {
        setGroup(data);
        setAccessLost(data === null || !data.memberIds.includes(currentUid));
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (isPermissionDenied(err)) {
          setAccessLost(true);
        } else {
          setError(getErrorMessage(err, 'Não foi possível carregar o grupo.'));
        }
        setGroup(null);
        setLoading(false);
      },
    );
  }, [groupId, currentUid]);

  return { group, loading, error, accessLost };
}
