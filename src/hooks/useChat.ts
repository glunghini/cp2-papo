import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createMessageId,
  requestPushForMessage,
  subscribeToConnection,
  subscribeToMessages,
  writeMessage,
} from '../services/chatService';
import type { ChatMessage, ConversationType, FailedMessage, OutgoingMessage } from '../types/chat';
import { getErrorMessage, isPermissionDenied } from '../utils/errors';

const PAGE_SIZE = 40;
// evita mostrar "sem conexão" no instante em que o app abre e ainda está conectando
const OFFLINE_GRACE_MS = 2500;

type UseChatParams = {
  conversationId: string;
  conversationType: ConversationType;
  currentUid: string;
  enabled: boolean;
};

export function useChat({ conversationId, conversationType, currentUid, enabled }: UseChatParams) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [failed, setFailed] = useState<FailedMessage | null>(null);
  const [pushWarning, setPushWarning] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Carregamento só ao abrir/trocar de conversa; carregar mensagens antigas não esconde a lista
  useEffect(() => {
    if (enabled) setLoading(true);
  }, [conversationId, enabled, reloadKey]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    setError(null);
    const unsubscribe = subscribeToMessages(
      conversationId,
      pageSize,
      (list) => {
        setMessages(list);
        setLoading(false);
      },
      (err) => {
        setError(
          isPermissionDenied(err)
            ? 'Você não tem acesso a esta conversa.'
            : getErrorMessage(err, 'Não foi possível carregar as mensagens.'),
        );
        setLoading(false);
      },
    );
    // remove o listener ao sair da tela ou trocar de conversa
    return unsubscribe;
  }, [conversationId, pageSize, enabled, reloadKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToConnection((isConnected) => {
      if (timer) clearTimeout(timer);
      if (isConnected) {
        setConnected(true);
      } else {
        timer = setTimeout(() => setConnected(false), OFFLINE_GRACE_MS);
      }
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const hasMore = messages.length >= pageSize;

  const loadMore = useCallback(() => {
    if (hasMore) setPageSize((size) => size + PAGE_SIZE);
  }, [hasMore]);

  const send = useCallback(
    async (message: OutgoingMessage): Promise<boolean> => {
      setFailed(null);

      let messageId: string;
      try {
        messageId = createMessageId(conversationId);
      } catch (err) {
        setFailed({ ...message, reason: getErrorMessage(err) });
        return false;
      }

      setPendingIds((ids) => [...ids, messageId]);
      try {
        await writeMessage({ conversationId, conversationType, messageId, senderId: currentUid, message });
      } catch (err) {
        setFailed({
          ...message,
          reason: isPermissionDenied(err)
            ? 'Você não pode mais enviar mensagens nesta conversa.'
            : getErrorMessage(err, 'A mensagem não foi enviada.'),
        });
        return false;
      } finally {
        setPendingIds((ids) => ids.filter((id) => id !== messageId));
      }

      // O push roda depois da gravação. Se falhar, a mensagem continua salva.
      requestPushForMessage(conversationId, messageId)
        .then(() => setPushWarning(null))
        .catch(() => setPushWarning('Mensagem enviada, mas o aviso por push não pôde ser disparado.'));

      return true;
    },
    [conversationId, conversationType, currentUid],
  );

  const retryFailed = useCallback(() => {
    if (!failed) return;
    const { reason: _reason, ...message } = failed;
    void send(message);
  }, [failed, send]);

  const dismissFailed = useCallback(() => setFailed(null), []);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const dismissPushWarning = useCallback(() => setPushWarning(null), []);

  const pending = useMemo(() => new Set(pendingIds), [pendingIds]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    send,
    pending,
    failed,
    retryFailed,
    dismissFailed,
    pushWarning,
    dismissPushWarning,
    connected,
    reload,
  };
}
