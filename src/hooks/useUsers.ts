import { useEffect, useMemo, useRef, useState } from 'react';

import { getProfileDetails, getPublicProfiles, subscribeToUsers } from '../services/userService';
import type { ChatUser, PublicUser } from '../types/user';
import { getErrorMessage } from '../utils/errors';

export function useUsers() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToUsers(
      (list) => {
        setUsers(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err, 'Não foi possível carregar os usuários.'));
        setLoading(false);
      },
    );
  }, []);

  return { users, loading, error };
}

/**
 * Busca nome e foto de uma lista de uids. Guarda o que já foi carregado
 * para não repetir leituras quando a lista muda pouco.
 */
export function usePublicProfiles(uids: readonly string[]) {
  const key = useMemo(() => Array.from(new Set(uids)).sort().join(','), [uids]);
  const cache = useRef<Record<string, PublicUser>>({});
  const [profiles, setProfiles] = useState<Record<string, PublicUser>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const ids = key ? key.split(',') : [];
    const missing = ids.filter((id) => cache.current[id] === undefined);

    if (missing.length === 0) {
      setProfiles(cache.current);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getPublicProfiles(missing)
      .then((found) => {
        const next = { ...cache.current };
        found.forEach((user) => {
          next[user.uid] = user;
        });
        cache.current = next;
        if (active) setProfiles(next);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key]);

  return { profiles, loading };
}

export function useProfileDetails(uid: string, currentUid: string) {
  const [profile, setProfile] = useState<ChatUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getProfileDetails(uid, currentUid)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        if (!result) setError('Perfil não encontrado.');
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err, 'Não foi possível carregar o perfil.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [uid, currentUid, attempt]);

  const reload = () => setAttempt((value) => value + 1);

  return { profile, loading, error, reload, setProfile };
}
