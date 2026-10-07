import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { openConversationFromNotification } from '../navigation/navigationRef';
import {
  addPushTokenRefreshListener,
  parseNotificationData,
  registerDeviceForPush,
} from '../services/notificationService';
import type { PushRegistrationStatus } from '../types/notification';
import { getErrorMessage } from '../utils/errors';

export type NotificationState = {
  status: PushRegistrationStatus;
  message: string | null;
  retry: () => void;
};

export function useNotifications(uid: string | null): NotificationState {
  const [status, setStatus] = useState<PushRegistrationStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const handledResponseId = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  const register = useCallback(async () => {
    if (!uid) return;
    setStatus('registering');
    setMessage(null);
    try {
      const result = await registerDeviceForPush(uid);
      switch (result.status) {
        case 'registered':
          setStatus('registered');
          break;
        case 'denied':
          setStatus('denied');
          setMessage('As notificações estão bloqueadas. Libere nas configurações do aparelho para receber avisos.');
          break;
        case 'unavailable':
          setStatus('unavailable');
          setMessage(result.reason);
          break;
        case 'error':
          setStatus('error');
          setMessage(result.reason);
          break;
      }
    } catch (error) {
      setStatus('error');
      setMessage(getErrorMessage(error, 'Não foi possível registrar este aparelho para notificações.'));
    }
  }, [uid]);

  useEffect(() => {
    if (uid) {
      void register();
    } else {
      setStatus('idle');
      setMessage(null);
    }
  }, [uid, register]);

  // O FCM/APNs pode trocar o token; quando isso acontece registramos de novo
  useEffect(() => {
    if (!uid) return undefined;
    const subscription = addPushTokenRefreshListener(() => {
      void register();
    });
    return () => subscription.remove();
  }, [uid, register]);

  // Toque na notificação, inclusive quando ela abriu o app que estava fechado
  useEffect(() => {
    if (!uid || !lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const responseId = lastResponse.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    const data = parseNotificationData(lastResponse.notification.request.content.data);
    if (!data) return;
    handledResponseId.current = responseId;
    openConversationFromNotification(data);
  }, [uid, lastResponse]);

  const retry = useCallback(() => {
    void register();
  }, [register]);

  return useMemo(() => ({ status, message, retry }), [status, message, retry]);
}
