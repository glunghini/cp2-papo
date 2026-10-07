import { useEffect, useMemo, useState } from 'react';

import { subscribeToDirectConversations, subscribeToLastMessage } from '../services/chatService';
import type { ChatMessage, ConversationListItem, DirectConversation } from '../types/chat';
import { getErrorMessage } from '../utils/errors';
import { useUserGroups } from './useGroups';

export function useConversations(uid: string) {
  const { groups, loading: groupsLoading, error: groupsError } = useUserGroups(uid);
  const [directs, setDirects] = useState<DirectConversation[]>([]);
  const [directsLoading, setDirectsLoading] = useState(true);
  const [directsError, setDirectsError] = useState<string | null>(null);

  useEffect(() => {
    setDirectsLoading(true);
    return subscribeToDirectConversations(
      uid,
      (list) => {
        setDirects(list);
        setDirectsError(null);
        setDirectsLoading(false);
      },
      (err) => {
        setDirectsError(getErrorMessage(err, 'Não foi possível carregar suas conversas.'));
        setDirectsLoading(false);
      },
    );
  }, [uid]);

  const items = useMemo<ConversationListItem[]>(() => {
    const directItems: ConversationListItem[] = directs.map((conversation) => ({
      type: 'direct',
      id: conversation.id,
      createdAt: conversation.createdAt,
      otherUserId:
        conversation.participants[0] === uid ? conversation.participants[1] : conversation.participants[0],
    }));
    const groupItems: ConversationListItem[] = groups.map((group) => ({
      type: 'group',
      id: group.id,
      createdAt: group.createdAt,
      group,
    }));
    return [...directItems, ...groupItems];
  }, [directs, groups, uid]);

  return {
    items,
    loading: groupsLoading || directsLoading,
    error: directsError ?? groupsError,
  };
}

export function useLastMessage(conversationId: string) {
  const [message, setMessage] = useState<ChatMessage | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    setUnavailable(false);
    return subscribeToLastMessage(conversationId, setMessage, () => setUnavailable(true));
  }, [conversationId]);

  return { message, unavailable };
}
