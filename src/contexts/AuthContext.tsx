import type { User } from 'firebase/auth';
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { login, logout, observeSession, register } from '../services/authService';
import { subscribeToPublicProfile } from '../services/userService';
import type { LoginInput, PublicUser, RegisterInput, RegisterResult } from '../types/user';

export type AuthStatus = 'loading' | 'signed-out' | 'missing-profile' | 'signed-in';

export type AuthContextValue = {
  status: AuthStatus;
  firebaseUser: User | null;
  user: PublicUser | null;
  isRegistering: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<RegisterResult>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

type Props = { children: ReactNode };

export function AuthProvider({ children }: Props) {
  // undefined = ainda não sabemos; null = não existe
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [profile, setProfile] = useState<PublicUser | null | undefined>(undefined);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => observeSession(setFirebaseUser), []);

  useEffect(() => {
    setProfile(undefined);
    if (!firebaseUser) return undefined;
    return subscribeToPublicProfile(firebaseUser.uid, setProfile, () => setProfile(null));
  }, [firebaseUser]);

  const status = useMemo<AuthStatus>(() => {
    if (firebaseUser === undefined) return 'loading';
    if (firebaseUser === null) return 'signed-out';
    if (profile === undefined) return 'loading';
    if (profile === null) return 'missing-profile';
    return 'signed-in';
  }, [firebaseUser, profile]);

  const signIn = useCallback((input: LoginInput) => login(input), []);

  const signUp = useCallback(async (input: RegisterInput) => {
    setIsRegistering(true);
    try {
      return await register(input);
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const uid = firebaseUser?.uid ?? null;
  const signOut = useCallback(() => logout(uid), [uid]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      firebaseUser: firebaseUser ?? null,
      user: status === 'signed-in' ? profile ?? null : null,
      isRegistering,
      signIn,
      signUp,
      signOut,
    }),
    [status, firebaseUser, profile, isRegistering, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
