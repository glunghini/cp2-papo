import { useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PrimaryButton } from '../components/PrimaryButton';
import { getPolicyLabel } from '../constants/notificationPolicies';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/useUsers';
import { removeGroupMember } from '../services/groupService';
import { colors, spacing } from '../theme';
import type { AppScreenProps } from '../types/navigation';
import type { PublicUser } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import { formatSlots } from '../utils/groupValidation';

export function GroupMembersScreen({ navigation, route }: AppScreenProps<'GroupMembers'>) {
  const { groupId } = route.params;
  const currentUser = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { group, loading, error, accessLost } = useGroup(groupId, currentUser.uid);
  const memberIds = useMemo(() => group?.memberIds ?? [], [group]);
  const { profiles } = usePublicProfiles(memberIds);
  const [leaving, setLeaving] = useState(false);

  // Proprietário primeiro, depois ordem alfabética
  const members = useMemo(() => {
    const loaded = memberIds
      .map((uid) => profiles[uid])
      .filter((member): member is PublicUser => member !== undefined);
    return loaded.sort((a, b) => {
      if (a.uid === group?.ownerId) return -1;
      if (b.uid === group?.ownerId) return 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });
  }, [memberIds, profiles, group?.ownerId]);

  if (loading) return <Loading label="Carregando integrantes" />;
  if (accessLost) {
    return (
      <ErrorMessage
        message="Você não faz mais parte deste grupo."
        onRetry={() => navigation.popToTop()}
        retryLabel="Voltar para conversas"
      />
    );
  }
  if (error || !group) return <ErrorMessage message={error ?? 'Grupo não encontrado.'} />;

  const isOwner = group.ownerId === currentUser.uid;

  const leaveGroup = () => {
    Alert.alert('Sair do grupo', 'Você deixa de receber as mensagens novas deste grupo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair do grupo',
        style: 'destructive',
        onPress: async () => {
          setLeaving(true);
          try {
            await removeGroupMember(group.id, currentUser.uid);
            navigation.popToTop();
          } catch (err) {
            setLeaving(false);
            Alert.alert('Não foi possível sair', getErrorMessage(err));
          }
        },
      },
    ]);
  };

  const header = (
    <View style={styles.summary}>
      <Avatar uri={group.photoUrl || null} size={96} variant="group" />
      <Text style={styles.groupName}>{group.name}</Text>
      <Text style={styles.meta}>{formatSlots(group.memberLimit, group.memberIds.length)}</Text>
      <Text style={styles.meta}>Notificações: {getPolicyLabel(group.notificationPolicy)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(member) => member.uid}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <GroupMemberItem
            user={item}
            isOwner={item.uid === group.ownerId}
            isCurrentUser={item.uid === currentUser.uid}
            onPress={() => navigation.navigate('Profile', { uid: item.uid })}
          />
        )}
      />
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        {isOwner ? (
          <PrimaryButton label="Editar grupo" onPress={() => navigation.navigate('GroupForm', { groupId: group.id })} />
        ) : (
          <PrimaryButton label="Sair do grupo" variant="danger" onPress={leaveGroup} loading={leaving} />
        )}
      </View>
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
  summary: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs,
  },
  groupName: {
    marginTop: spacing.md,
    fontSize: 22,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  meta: {
    fontSize: 14,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg + 40 + spacing.md,
    backgroundColor: colors.line,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
});
