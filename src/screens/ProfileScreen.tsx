import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { ErrorMessage } from '../components/ErrorMessage';
import { Loading } from '../components/Loading';
import { PhotoPicker } from '../components/PhotoPicker';
import { useCurrentUser } from '../hooks/useAuth';
import { useProfileDetails } from '../hooks/useUsers';
import { updateOwnPhoto } from '../services/userService';
import { colors, radius, spacing } from '../theme';
import type { AppScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { formatIsoDate } from '../utils/format';

const UNAVAILABLE = 'Não informado';

type InfoRowProps = { label: string; value: string };

function InfoRow({ label, value }: InfoRowProps) {
  const missing = value.trim().length === 0;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, missing && styles.rowMissing]} selectable={!missing}>
        {missing ? UNAVAILABLE : value}
      </Text>
    </View>
  );
}

export function ProfileScreen({ route }: AppScreenProps<'Profile'>) {
  const { uid } = route.params;
  const currentUser = useCurrentUser();
  const isSelf = uid === currentUser.uid;
  const { profile, loading, error, reload, setProfile } = useProfileDetails(uid, currentUser.uid);
  const [uploading, setUploading] = useState(false);

  const changePhoto = async (localUri: string) => {
    setUploading(true);
    try {
      const photoUrl = await updateOwnPhoto(currentUser.uid, localUri);
      setProfile((current) => (current ? { ...current, photoUrl } : current));
    } catch (err) {
      Alert.alert('Foto não atualizada', getErrorMessage(err, 'Tente escolher a imagem de novo.'));
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Loading label="Carregando perfil" />;
  if (error || !profile) return <ErrorMessage message={error ?? 'Perfil não encontrado.'} onRetry={reload} />;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.top}>
        {isSelf ? (
          <PhotoPicker uri={profile.photoUrl || null} variant="user" onPicked={(uri) => void changePhoto(uri)} disabled={uploading} />
        ) : (
          <View style={styles.avatarWrap}>
            <Avatar uri={profile.photoUrl || null} size={112} />
          </View>
        )}
        {uploading ? <Text style={styles.uploading}>Enviando foto</Text> : null}
        <Text style={styles.name}>{profile.name}</Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="E-mail" value={profile.email} />
        <InfoRow label="Celular" value={profile.phoneNumber} />
        <InfoRow label="Data de nascimento" value={formatIsoDate(profile.birthDate)} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.xl,
  },
  top: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    marginBottom: spacing.lg,
  },
  uploading: {
    fontSize: 13,
    color: colors.inkMuted,
    marginBottom: spacing.sm,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
  },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 16,
    color: colors.ink,
  },
  rowMissing: {
    color: colors.inkSoft,
    fontStyle: 'italic',
  },
});
