import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { UserItem } from '../components/UserItem';
import { useCurrentUser } from '../hooks/useAuth';
import { useUsers } from '../hooks/useUsers';
import { getOrCreateDirectConversation } from '../services/chatService';
import { colors, radius, spacing } from '../theme';
import type { AppScreenProps } from '../types/navigation';
import type { PublicUser } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { normalizeText } from '../utils/format';

export function UsersScreen({ navigation, route }: AppScreenProps<'Users'>) {
  const params = route.params;
  const isSelecting = params.mode === 'select';
  const currentUser = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { users, loading, error } = useUsers();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>(params.mode === 'select' ? params.selectedIds : []);
  const [openingUid, setOpeningUid] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isSelecting ? 'Escolher integrantes' : 'Nova conversa' });
  }, [navigation, isSelecting]);

  // O próprio usuário nunca aparece: não dá para conversar consigo mesmo
  const hiddenIds = useMemo(() => {
    const ids = params.mode === 'select' ? [...params.excludeIds, currentUser.uid] : [currentUser.uid];
    return new Set(ids);
  }, [params, currentUser.uid]);

  const visibleUsers = useMemo(() => {
    const term = normalizeText(search.trim());
    return users
      .filter((user) => !hiddenIds.has(user.uid))
      .filter((user) => term.length === 0 || normalizeText(user.name).includes(term));
  }, [users, hiddenIds, search]);

  const maxSelectable = params.mode === 'select' ? params.maxSelectable : null;
  const limitReached = maxSelectable !== null && selected.length >= maxSelectable;

  const toggleSelection = useCallback((uid: string) => {
    setSelected((current) => (current.includes(uid) ? current.filter((id) => id !== uid) : [...current, uid]));
  }, []);

  const startConversation = useCallback(
    async (user: PublicUser) => {
      setOpeningUid(user.uid);
      try {
        const conversationId = await getOrCreateDirectConversation(currentUser.uid, user.uid);
        navigation.replace('Chat', { conversationId, conversationType: 'direct' });
      } catch (err) {
        Alert.alert('Não foi possível abrir a conversa', getErrorMessage(err));
        setOpeningUid(null);
      }
    },
    [currentUser.uid, navigation],
  );

  const confirmSelection = () => {
    if (params.mode !== 'select') return;
    if (params.groupId) {
      navigation.popTo('GroupForm', { groupId: params.groupId, pickedUserIds: selected });
    } else {
      navigation.popTo('GroupForm', { pickedUserIds: selected });
    }
  };

  const renderItem = ({ item }: { item: PublicUser }) => {
    if (!isSelecting) {
      return (
        <UserItem
          user={item}
          onPress={() => void startConversation(item)}
          disabled={openingUid !== null}
          note={openingUid === item.uid ? 'Abrindo conversa' : undefined}
        />
      );
    }
    const isSelected = selected.includes(item.uid);
    return (
      <UserItem
        user={item}
        selectable
        selected={isSelected}
        disabled={!isSelected && limitReached}
        onPress={() => toggleSelection(item.uid)}
      />
    );
  };

  if (loading) return <Loading label="Carregando pessoas" />;
  if (error) return <ErrorMessage message={error} />;

  let selectionSummary: string | null = null;
  if (isSelecting) {
    selectionSummary =
      maxSelectable === null
        ? `${selected.length} selecionado${selected.length === 1 ? '' : 's'}`
        : `${selected.length} de ${maxSelectable} vaga${maxSelectable === 1 ? '' : 's'} usada${maxSelectable === 1 ? '' : 's'}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchBox}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar pelo nome"
          placeholderTextColor={colors.inkSoft}
          autoCorrect={false}
          style={styles.search}
          accessibilityLabel="Buscar pelo nome"
        />
        {selectionSummary ? (
          <Text style={[styles.summary, limitReached && styles.summaryFull]}>
            {limitReached ? `${selectionSummary}. Limite do grupo atingido.` : selectionSummary}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={visibleUsers}
        keyExtractor={(user) => user.uid}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={Separator}
        contentContainerStyle={visibleUsers.length === 0 ? styles.emptyContent : undefined}
        ListEmptyComponent={
          <EmptyState
            title={search ? 'Ninguém com esse nome' : 'Nenhuma pessoa disponível'}
            description={
              search ? 'Confira a grafia ou busque só pelo primeiro nome.' : 'Quando outras pessoas criarem conta, elas aparecem aqui.'
            }
          />
        }
      />

      {isSelecting ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <PrimaryButton label="Confirmar" onPress={confirmSelection} />
        </View>
      ) : null}
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
  searchBox: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  search: {
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontSize: 16,
    color: colors.ink,
  },
  summary: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.inkMuted,
  },
  summaryFull: {
    color: colors.warning,
    fontWeight: '600',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 44 + spacing.md,
    backgroundColor: colors.line,
  },
  emptyContent: {
    flexGrow: 1,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
