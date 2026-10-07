import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import type { ConversationType } from '../types/chat';
import type {
  ChatNotificationData,
  DeviceRegistration,
  PushRegistrationResult,
} from '../types/notification';
import { isRecord } from '../utils/parse';
import { firestore } from './firebase';

const ANDROID_CHANNEL_ID = 'messages';
const INSTALLATION_ID_KEY = 'papo:installation-id';

// Conversa aberta na tela. Push dessa conversa não precisa aparecer como banner.
let activeConversationId: string | null = null;

export function setActiveConversation(conversationId: string | null): void {
  activeConversationId = conversationId;
}

export function parseNotificationData(data: unknown): ChatNotificationData | null {
  if (!isRecord(data)) return null;
  const { conversationId, conversationType, messageId } = data;
  if (typeof conversationId !== 'string' || conversationId.length === 0) return null;
  if (conversationType !== 'direct' && conversationType !== 'group') return null;
  const type: ConversationType = conversationType;
  return {
    conversationId,
    conversationType: type,
    messageId: typeof messageId === 'string' ? messageId : null,
  };
}

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const data = parseNotificationData(notification.request.content.data);
      const conversationIsOpen = data !== null && data.conversationId === activeConversationId;
      return {
        shouldShowBanner: !conversationIsOpen,
        shouldShowList: !conversationIsOpen,
        shouldPlaySound: !conversationIsOpen,
        shouldSetBadge: false,
      };
    },
  });
}

async function getInstallationId(): Promise<string> {
  const stored = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (stored) return stored;
  const created = Crypto.randomUUID();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

function getEasProjectId(): string | null {
  const extra: unknown = Constants.expoConfig?.extra;
  const fromExtra: unknown = isRecord(extra) && isRecord(extra.eas) ? extra.eas.projectId : undefined;
  const projectId = typeof fromExtra === 'string' ? fromExtra : Constants.easConfig?.projectId;
  if (!projectId || projectId.startsWith('COLOQUE')) return null;
  return projectId;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Mensagens',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#2B4C7E',
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function registerDeviceForPush(uid: string): Promise<PushRegistrationResult> {
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    return { status: 'unavailable', reason: 'Notificações push só existem no Android e no iOS.' };
  }
  if (!Device.isDevice) {
    return { status: 'unavailable', reason: 'Push só funciona em aparelho físico. Emuladores não recebem token.' };
  }

  // No Android 13+ o canal precisa existir antes do pedido de permissão
  await ensureAndroidChannel();

  const granted = await ensurePermission();
  if (!granted) return { status: 'denied' };

  const projectId = getEasProjectId();
  if (!projectId) {
    return { status: 'error', reason: 'O projectId do EAS não está configurado no app.' };
  }

  let token: string;
  try {
    const result = await Notifications.getExpoPushTokenAsync({ projectId });
    token = result.data;
  } catch {
    return {
      status: 'error',
      reason: 'Não foi possível obter o token deste aparelho. Confira a configuração do FCM.',
    };
  }

  const deviceId = await getInstallationId();
  const registration: DeviceRegistration = {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    enabled: true,
    updatedAt: Date.now(),
  };
  await setDoc(doc(firestore, 'users', uid, 'devices', deviceId), registration);
  return { status: 'registered', token };
}

/** Chamado no logout para o aparelho parar de receber push da conta anterior. */
export async function unregisterDevice(uid: string): Promise<void> {
  const deviceId = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (!deviceId) return;
  await deleteDoc(doc(firestore, 'users', uid, 'devices', deviceId));
}

export function addPushTokenRefreshListener(onRefresh: () => void): { remove: () => void } {
  return Notifications.addPushTokenListener(() => onRefresh());
}

export async function clearDeliveredNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
