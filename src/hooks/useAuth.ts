import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from '../contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  }
  return context;
}

/** Para telas que só existem com usuário logado. */
export function useCurrentUser() {
  const { user } = useAuth();
  if (!user) {
    throw new Error('Esta tela exige um usuário autenticado.');
  }
  return user;
}
