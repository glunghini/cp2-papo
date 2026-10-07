import { useFocusEffect } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ListRenderItemInfo,
} from 'react-native';

import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
import { ChatInput } from '../components/ChatInput';
import { ChatMessageItem } from '../components/ChatMessage';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { useCurrentUser } from '../hooks/useAuth';
import { useChat } from '../hooks/useChat';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/useUsers';
import { syncGroupMembership } from '../services/groupService';
import { setActiveConversation } from '../services/notificationService';
import { colors, spacing } from '../theme';
import type { ChatMessage, OutgoingMessage } from '../types/chat';
import type { AppScreenProps } from '../types/navigation';
import type { PublicUser } from '../types/user';
import { getOtherParticipant } from '../utils/conversationId';
import { firstName } from '../utils/format';

type HeaderProps = {
  title: string;
  subtitle: string;
  photoUrl: string | null;
  variant: 'user' | 'group';
  onPress: () => void;
};

function ChatHeader({ title, subtitle, photoUrl, variant, onPress }: HeaderProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.header}
      accessibilityRole="button"
      accessibilityLabel={variant === 'group' ? `Ver integrantes de ${title}` : `Ver perfil de ${title}`}
    >
      <Avatar uri={photoUrl} size={34} variant={variant} />
      <View style={styles.headerTexts}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.headerSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

export function ChatScreen({ navigation, route }: AppScreenProps<'Chat'>) {
  const { conversationId, conversationType } = route.params;
  const currentUser = useCurrentUser();
  const headerHeight = useHeaderHeight();
  const isGroup = conversationType === 'group';
  const otherUid = isGroup ? null : getOtherParticipant(conversationId, currentUser.uid);

  const { group, loading: groupLoading, accessLost } = useGroup(isGroup ? conversationId : null, currentUser.uid);
  const canChat = isGroup ? group !== null && !accessLost : otherUid !== null;

  const {
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
  } = useChat({ conversationId, conversationType, currentUid: currentUser.uid, enabled: canChat });

  // Perfis de integrantes atuais, de quem já escreveu e do outro participante
  const profileIds = useMemo(() => {
    const ids = new Set<string>(group?.memberIds ?? []);
    messages.forEach((message) => ids.add(message.senderId));
    if (otherUid) ids.add(otherUid);
    return Array.from(ids);
  }, [group, messages, otherUid]);
  const { profiles } = usePublicProfiles(profileIds);

  const otherUser = otherUid ? profiles[otherUid] : undefined;

  const resolveName = useCallback(
    (uid: string) => (uid === currentUser.uid ? 'você' : profiles[uid]?.name ?? 'Ex-integrante'),
    [profiles, currentUser.uid],
  );

  const mentionableMembers = useMemo<PublicUser[]>(() => {
    if (!group) return [];
    return group.memberIds
      .filter((uid) => uid !== currentUser.uid)
      .map((uid) => profiles[uid])
      .filter((member): member is PublicUser => member !== undefined);
  }, [group, profiles, currentUser.uid]);

  // Se o Firestore diz que o usuário é integrante mas o Realtime Database negou,
  // pede para a API reaplicar a lista de integrantes uma vez.
  const [syncTried, setSyncTried] = useState(false);
  useEffect(() => {
    if (!isGroup || !group || accessLost || !error || syncTried) return;
    setSyncTried(true);
    syncGroupMembership(conversationId)
      .then(reload)
      .catch(() => undefined);
  }, [isGroup, group, accessLost, error, syncTried, conversationId, reload]);

  // Enquanto esta conversa está aberta, o push dela não aparece como banner
  useFocusEffect(
    useCallback(() => {
      setActiveConversation(conversationId);
      return () => setActiveConversation(null);
    }, [conversationId]),
  );

  const openDetails = useCallback(() => {
    if (isGroup) {
      navigation.navigate('GroupMembers', { groupId: conversationId });
    } else if (otherUid) {
      navigation.navigate('Profile', { uid: otherUid });
    }
  }, [isGroup, otherUid, conversationId, navigation]);

  const headerTitle = isGroup ? group?.name ?? 'Grupo' : otherUser?.name ?? 'Conversa';
  const headerSubtitle = isGroup
    ? group
      ? `${group.memberIds.length} integrantes`
      : ''
    : 'Toque para ver o perfil';
  const headerPhoto = isGroup ? group?.photoUrl ?? null : otherUser?.photoUrl ?? null;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <ChatHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          photoUrl={headerPhoto}
          variant={isGroup ? 'group' : 'user'}
          onPress={openDetails}
        />
      ),
    });
  }, [navigation, headerTitle, headerSubtitle, headerPhoto, isGroup, openDetails]);

  // A lista é invertida: o item 0 fica embaixo, perto do campo de texto
  const data = useMemo(() => [...messages].reverse(), [messages]);

  const renderMessage = useCallback(
    ({ item, index }: ListRenderItemInfo<ChatMessage>) => {
      const isOwn = item.senderId === currentUser.uid;
      const older = data[index + 1];
      const showAuthor = isGroup && !isOwn && (!older || older.senderId !== item.senderId);
      return (
        <ChatMessageItem
          message={item}
          currentUid={currentUser.uid}
          isOwn={isOwn}
          authorName={showAuthor ? profiles[item.senderId]?.name ?? 'Ex-integrante' : null}
          pending={pending.has(item.id)}
          resolveName={resolveName}
        />
      );
    },
    [currentUser.uid, data, isGroup, profiles, pending, resolveName],
  );

  const handleSend = useCallback(
    (message: OutgoingMessage) => {
      void send(message);
    },
    [send],
  );

  if (isGroup && groupLoading) return <Loading label="Abrindo grupo" />;

  let disabledReason: string | undefined;
  if (isGroup && accessLost) disabledReason = 'Você não faz mais parte deste grupo.';
  if (!isGroup && !otherUid) disabledReason = 'Esta conversa não é válida para a sua conta.';

  const emptyTitle = isGroup ? 'O grupo ainda está em silêncio' : 'Nenhuma mensagem ainda';
  const emptyDescription = isGroup
    ? 'Mande a primeira mensagem. Use @ para chamar alguém específico.'
    : `Diga oi para ${otherUser ? firstName(otherUser.name) : 'a pessoa'}.`;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
    >
      {!connected ? (
        <Banner tone="warning" message="Sem conexão. As mensagens serão enviadas quando a internet voltar." />
      ) : null}
      {error && !disabledReason ? <Banner tone="error" message={error} actionLabel="Recarregar" onAction={reload} /> : null}
      {failed ? (
        <Banner
          tone="error"
          message={`${failed.reason} "${failed.text.length > 40 ? `${failed.text.slice(0, 40)}...` : failed.text}"`}
          actionLabel="Tentar de novo"
          onAction={retryFailed}
          onDismiss={dismissFailed}
        />
      ) : null}
      {pushWarning ? <Banner tone="info" message={pushWarning} onDismiss={dismissPushWarning} /> : null}

      <View style={styles.flex}>
        {loading && canChat ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : data.length === 0 ? (
          <EmptyState title={emptyTitle} description={canChat ? emptyDescription : undefined} />
        ) : (
          <FlatList
            data={data}
            inverted
            keyExtractor={(message) => message.id}
            renderItem={renderMessage}
            onEndReached={hasMore ? loadMore : undefined}
            onEndReachedThreshold={0.3}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              hasMore ? <Text style={styles.loadMore}>Role para carregar mensagens anteriores</Text> : null
            }
          />
        )}
      </View>

      <ChatInput
        mentionableMembers={mentionableMembers}
        onSend={handleSend}
        disabled={!canChat}
        disabledReason={disabledReason}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 260,
  },
  headerTexts: {
    flexShrink: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.ink,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  listContent: {
    paddingVertical: spacing.md,
  },
  loadMore: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.inkSoft,
    paddingVertical: spacing.md,
  },
});
