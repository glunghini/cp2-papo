import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHeaderHeight } from '@react-navigation/elements';

import { Banner } from '../components/Banner';
import { ErrorMessage } from '../components/ErrorMessage';
import { FormField } from '../components/FormField';
import { GroupMemberItem } from '../components/GroupMemberItem';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { PolicySelector } from '../components/PolicySelector';
import { PrimaryButton } from '../components/PrimaryButton';
import { useCurrentUser } from '../hooks/useAuth';
import { useGroup } from '../hooks/useGroups';
import { usePublicProfiles } from '../hooks/useUsers';
import {
  addGroupMembers,
  createGroup,
  removeGroupMember,
  updateGroupPhoto,
  updateGroupSettings,
} from '../services/groupService';
import { colors, radius, spacing } from '../theme';
import type { NotificationPolicy } from '../types/group';
import type { AppScreenProps } from '../types/navigation';
import type { PublicUser } from '../types/user';
import { getErrorMessage } from '../utils/errors';
import {
  formatSlots,
  getAvailableSlots,
  MAX_GROUP_LIMIT,
  parseMemberLimit,
  validateGroupName,
  validateMemberCount,
  validateMemberLimit,
} from '../utils/groupValidation';

type FormErrors = { name?: string; limit?: string; members?: string };

const DEFAULT_LIMIT = '5';

export function GroupFormScreen({ navigation, route }: AppScreenProps<'GroupForm'>) {
  const currentUser = useCurrentUser();
  const headerHeight = useHeaderHeight();
  const groupId = route.params?.groupId ?? null;
  const pickedUserIds = route.params?.pickedUserIds;
  const isEdit = groupId !== null;

  const { group, loading, error: groupError, accessLost } = useGroup(groupId, currentUser.uid);

  const [name, setName] = useState('');
  const [limitText, setLimitText] = useState(DEFAULT_LIMIT);
  const [policy, setPolicy] = useState<NotificationPolicy>('all_group_messages');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [membersBusy, setMembersBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const filledFromGroup = useRef(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Editar grupo' : 'Novo grupo' });
  }, [navigation, isEdit]);

  // Na edição, os campos começam com os dados atuais do grupo
  useEffect(() => {
    if (!group || filledFromGroup.current) return;
    filledFromGroup.current = true;
    setName(group.name);
    setLimitText(String(group.memberLimit));
    setPolicy(group.notificationPolicy);
  }, [group]);

  const memberIds = useMemo(
    () => (isEdit ? group?.memberIds ?? [] : [currentUser.uid, ...selectedIds]),
    [isEdit, group, currentUser.uid, selectedIds],
  );
  const memberCount = memberIds.length;
  const parsedLimit = parseMemberLimit(limitText);
  const { profiles } = usePublicProfiles(memberIds);
  const isOwner = !isEdit || group?.ownerId === currentUser.uid;

  // Volta da tela de usuários com as pessoas escolhidas
  useEffect(() => {
    if (!pickedUserIds) return;
    navigation.setParams({ pickedUserIds: undefined });

    if (!isEdit) {
      setSelectedIds(pickedUserIds.filter((id) => id !== currentUser.uid));
      setErrors((current) => ({ ...current, members: undefined }));
      return;
    }
    if (!groupId || pickedUserIds.length === 0) return;

    setMembersBusy(true);
    setFormError(null);
    addGroupMembers(groupId, pickedUserIds)
      .catch((err: unknown) => setFormError(getErrorMessage(err, 'Não foi possível adicionar os integrantes.')))
      .finally(() => setMembersBusy(false));
  }, [pickedUserIds, isEdit, groupId, navigation, currentUser.uid]);

  const openUserPicker = () => {
    if (isEdit && groupId && group) {
      const available = getAvailableSlots(group.memberLimit, memberCount);
      if (available === 0) {
        Alert.alert('Grupo cheio', 'Aumente o limite e salve antes de adicionar mais pessoas.');
        return;
      }
      navigation.navigate('Users', {
        mode: 'select',
        groupId,
        selectedIds: [],
        excludeIds: memberIds,
        maxSelectable: available,
      });
      return;
    }
    navigation.navigate('Users', {
      mode: 'select',
      groupId: null,
      selectedIds,
      excludeIds: [currentUser.uid],
      // o proprietário ocupa uma das vagas
      maxSelectable: parsedLimit !== null ? Math.max(Math.min(parsedLimit, MAX_GROUP_LIMIT) - 1, 0) : null,
    });
  };

  const removeMember = useCallback(
    async (member: PublicUser) => {
      if (!isEdit) {
        setSelectedIds((current) => current.filter((id) => id !== member.uid));
        return;
      }
      if (!groupId) return;
      setRemovingId(member.uid);
      setFormError(null);
      try {
        await removeGroupMember(groupId, member.uid);
      } catch (err) {
        setFormError(getErrorMessage(err, 'Não foi possível remover o integrante.'));
      } finally {
        setRemovingId(null);
      }
    },
    [isEdit, groupId],
  );

  const confirmRemove = (member: PublicUser) => {
    if (!isEdit) {
      void removeMember(member);
      return;
    }
    Alert.alert('Remover integrante', `${member.name} deixa de ver e enviar mensagens neste grupo.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => void removeMember(member) },
    ]);
  };

  const handleSubmit = async () => {
    const nextErrors: FormErrors = {
      name: validateGroupName(name) ?? undefined,
      limit: validateMemberLimit(limitText, memberCount) ?? undefined,
      members: validateMemberCount(memberCount) ?? undefined,
    };
    setErrors(nextErrors);
    if (nextErrors.name || nextErrors.limit || nextErrors.members || parsedLimit === null) return;

    setSaving(true);
    setFormError(null);
    try {
      if (isEdit && groupId) {
        await updateGroupSettings(groupId, currentUser.uid, {
          name,
          memberLimit: parsedLimit,
          notificationPolicy: policy,
        });
        if (photoUri) {
          try {
            await updateGroupPhoto(groupId, photoUri);
          } catch {
            Alert.alert('Alterações salvas', 'Só a foto não pôde ser enviada. Tente escolher a imagem de novo.');
          }
        }
        navigation.goBack();
        return;
      }

      const result = await createGroup(
        { name, memberIds: selectedIds, memberLimit: parsedLimit, notificationPolicy: policy, photoUri },
        currentUser.uid,
      );
      if (result.photoUploadFailed) {
        Alert.alert('Grupo criado', 'A foto não pôde ser enviada. Você pode trocá-la depois em Editar grupo.');
      }
      navigation.replace('Chat', { conversationId: result.groupId, conversationType: 'group' });
    } catch (err) {
      setFormError(getErrorMessage(err, isEdit ? 'Não foi possível salvar o grupo.' : 'Não foi possível criar o grupo.'));
      setSaving(false);
    }
  };

  if (isEdit && loading) return <Loading label="Carregando grupo" />;
  if (isEdit && accessLost) {
    return <ErrorMessage message="Você não faz mais parte deste grupo." onRetry={() => navigation.popToTop()} retryLabel="Voltar" />;
  }
  if (isEdit && groupError) return <ErrorMessage message={groupError} />;
  if (isEdit && !isOwner) {
    return <ErrorMessage message="Só o proprietário pode editar este grupo." onRetry={() => navigation.goBack()} retryLabel="Voltar" />;
  }

  const slotsText =
    parsedLimit !== null && parsedLimit >= memberCount ? formatSlots(parsedLimit, memberCount) : undefined;

  const orderedMembers = memberIds
    .map((uid) => profiles[uid])
    .filter((member): member is PublicUser => member !== undefined);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoPicker
          uri={photoUri ?? group?.photoUrl ?? null}
          variant="group"
          onPicked={setPhotoUri}
          disabled={saving}
          label="Adicionar foto do grupo"
        />

        <FormField label="Nome do grupo" value={name} onChangeText={setName} error={errors.name} maxLength={60} />

        <FormField
          label="Limite de integrantes"
          value={limitText}
          onChangeText={(text) => setLimitText(text.replace(/\D/g, ''))}
          error={errors.limit}
          hint={slotsText ?? `Entre 2 e ${MAX_GROUP_LIMIT}, contando com você.`}
          keyboardType="number-pad"
          maxLength={3}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Integrantes</Text>
          <PrimaryButton
            label={isEdit ? 'Adicionar' : 'Escolher'}
            variant="secondary"
            compact
            onPress={openUserPicker}
            disabled={saving || membersBusy}
            loading={membersBusy}
          />
        </View>
        {errors.members ? <Text style={styles.fieldError}>{errors.members}</Text> : null}

        <View style={styles.members}>
          {orderedMembers.map((member) => {
            const isGroupOwner = isEdit ? member.uid === group?.ownerId : member.uid === currentUser.uid;
            const isMe = member.uid === currentUser.uid;
            return (
              <GroupMemberItem
                key={member.uid}
                user={member}
                isOwner={isGroupOwner}
                isCurrentUser={isMe}
                onRemove={isGroupOwner ? undefined : () => confirmRemove(member)}
                removing={removingId === member.uid}
              />
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, styles.policyTitle]}>Notificações push</Text>
        <PolicySelector value={policy} onChange={setPolicy} disabled={saving} />

        {formError ? (
          <View style={styles.bannerWrap}>
            <Banner tone="error" message={formError} onDismiss={() => setFormError(null)} />
          </View>
        ) : null}

        <View style={styles.submit}>
          <PrimaryButton
            label={isEdit ? 'Salvar alterações' : 'Criar grupo'}
            onPress={() => void handleSubmit()}
            loading={saving}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  policyTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  fieldError: {
    fontSize: 13,
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  members: {
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  bannerWrap: {
    marginTop: spacing.lg,
    marginHorizontal: -spacing.lg,
  },
  submit: {
    marginTop: spacing.xl,
  },
});
