import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Banner } from '../components/Banner';
import { ConversationItem } from '../components/ConversationItem';
import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { useNotificationStatus } from '../contexts/NotificationContext';
import { useAuth, useCurrentUser } from '../hooks/useAuth';
import { useConversations } from '../hooks/useConversations';
import { usePublicProfiles } from '../hooks/useUsers';
import { colors, spacing } from '../theme';
import type { ConversationListItem } from '../types/chat';
import type { AppScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';

export function ConversationsScreen({ navigation }: AppScreenProps<'Conversations'>) {
  const user = useCurrentUser();
  const { signOut } = useAuth();
  const notifications = useNotificationStatus();
  const { items, loading, error } = useConversations(user.uid);
  const [activity, setActivity] = useState<Record<string, number>>({});
  const [signingOut, setSigningOut] = useState(false);

  const otherUserIds = useMemo(
    () => items.flatMap((item) => (item.type === 'direct' ? [item.otherUserId] : [])),
    [items],
  );
  const { profiles } = usePublicProfiles(otherUserIds);

  // Cada item informa a hora da última mensagem; a lista ordena pela atividade mais recente
  const handleActivity = useCallback((conversationId: string, timestamp: number) => {
    setActivity((current) =>
      current[conversationId] === timestamp ? current : { ...current, [conversationId]: timestamp },
    );
  }, []);

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => (activity[b.id] ?? b.createdAt) - (activity[a.id] ?? a.createdAt),
      ),
    [items, activity],
  );

  const openConversation = useCallback(
    (item: ConversationListItem) => {
      navigation.navigate('Chat', { conversationId: item.id, conversationType: item.type });
    },
    [navigation],
  );

  const confirmSignOut = useCallback(() => {
    Alert.alert('Sair da conta', 'Este aparelho deixa de receber notificações desta conta.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
          } catch (err) {
            setSigningOut(false);
            Alert.alert('Não foi possível sair', getErrorMessage(err));
          }
        },
      },
    ]);
  }, [signOut]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Avatar
          uri={user.photoUrl}
          size={32}
          onPress={() => navigation.navigate('Profile', { uid: user.uid })}
          accessibilityLabel="Abrir meu perfil"
        />
      ),
      headerRight: () => (
        <Pressable onPress={confirmSignOut} disabled={signingOut} hitSlop={10} accessibilityRole="button">
          <Text style={[styles.headerAction, signingOut && styles.headerActionDisabled]}>
            {signingOut ? 'Saindo' : 'Sair'}
          </Text>
        </Pressable>
      ),
    });
  }, [navigation, user.photoUrl, user.uid, confirmSignOut, signingOut]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationListItem }) => (
      <ConversationItem
        item={item}
        currentUid={user.uid}
        otherUser={item.type === 'direct' ? profiles[item.otherUserId] : undefined}
        onPress={openConversation}
        onActivity={handleActivity}
      />
    ),
    [user.uid, profiles, openConversation, handleActivity],
  );

  const notificationBanner = (() => {
    if (notifications.status === 'denied' && notifications.message) {
      return (
        <Banner
          tone="warning"
          message={notifications.message}
          actionLabel="Abrir configurações"
          onAction={() => void Linking.openSettings()}
        />
      );
    }
    if (notifications.status === 'error' && notifications.message) {
      return (
        <Banner tone="error" message={notifications.message} actionLabel="Tentar de novo" onAction={notifications.retry} />
      );
    }
    if (notifications.status === 'unavailable' && notifications.message) {
      return <Banner tone="info" message={notifications.message} />;
    }
    return null;
  })();

  if (loading && items.length === 0) return <Loading label="Carregando conversas" />;

  return (
    <View style={styles.container}>
      {notificationBanner}

      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <PrimaryButton label="Nova conversa" compact onPress={() => navigation.navigate('Users', { mode: 'direct' })} />
        </View>
        <View style={styles.actionItem}>
          <PrimaryButton label="Novo grupo" compact variant="secondary" onPress={() => navigation.navigate('GroupForm')} />
        </View>
      </View>

      {error && items.length === 0 ? (
        <ErrorMessage message={error} />
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ItemSeparatorComponent={Separator}
          contentContainerStyle={sortedItems.length === 0 ? styles.emptyContent : undefined}
          ListEmptyComponent={
            <EmptyState
              title="Nenhuma conversa por aqui"
              description="Comece falando com alguém ou monte um grupo."
              actionLabel="Escolher uma pessoa"
              onAction={() => navigation.navigate('Users', { mode: 'direct' })}
            />
          }
        />
      )}
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionItem: {
    flex: 1,
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  headerActionDisabled: {
    opacity: 0.5,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 50 + spacing.md,
    backgroundColor: colors.line,
  },
  emptyContent: {
    flexGrow: 1,
  },
});
