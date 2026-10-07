import { createNavigationContainerRef, StackActions } from '@react-navigation/native';

import type { ChatNotificationData } from '../types/notification';
import type { AppStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<AppStackParamList>();

let pendingChat: AppStackParamList['Chat'] | null = null;

function appStackIsMounted(): boolean {
  if (!navigationRef.isReady()) return false;
  const routeNames: readonly string[] = navigationRef.getRootState().routeNames;
  return routeNames.includes('Chat');
}

/**
 * O toque na notificação pode chegar antes do app terminar de carregar a sessão.
 * Nesse caso a conversa fica guardada e é aberta assim que a pilha logada montar.
 */
export function openConversationFromNotification(data: ChatNotificationData): void {
  const params = { conversationId: data.conversationId, conversationType: data.conversationType };
  if (appStackIsMounted()) {
    navigationRef.dispatch(StackActions.push('Chat', params));
  } else {
    pendingChat = params;
  }
}

export function flushPendingNavigation(): void {
  if (!pendingChat || !appStackIsMounted()) return;
  const params = pendingChat;
  pendingChat = null;
  navigationRef.dispatch(StackActions.push('Chat', params));
}
