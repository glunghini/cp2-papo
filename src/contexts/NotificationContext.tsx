import { createContext, useContext, type ReactNode } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useNotifications, type NotificationState } from '../hooks/useNotifications';

const NotificationContext = createContext<NotificationState | null>(null);

type Props = { children: ReactNode };

export function NotificationProvider({ children }: Props) {
  const { user } = useAuth();
  const state = useNotifications(user?.uid ?? null);
  return <NotificationContext.Provider value={state}>{children}</NotificationContext.Provider>;
}

export function useNotificationStatus(): NotificationState {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationStatus precisa estar dentro de <NotificationProvider>.');
  }
  return context;
}
