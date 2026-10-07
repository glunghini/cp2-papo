import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { PublicUser } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  user: PublicUser;
  isOwner: boolean;
  isCurrentUser: boolean;
  onPress?: () => void;
  onRemove?: () => void;
  removing?: boolean;
};

export function GroupMemberItem({ user, isOwner, isCurrentUser, onPress, onRemove, removing = false }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ver perfil de ${user.name}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <Avatar uri={user.photoUrl} size={40} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {isCurrentUser ? `${user.name} (você)` : user.name}
          </Text>
          {isOwner ? <Text style={styles.role}>Proprietário</Text> : null}
        </View>
      </Pressable>
      {onRemove ? (
        <Pressable
          onPress={onRemove}
          disabled={removing}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Remover ${user.name} do grupo`}
          style={({ pressed }) => [styles.remove, (pressed || removing) && styles.pressed]}
        >
          <Text style={styles.removeLabel}>{removing ? 'Removendo' : 'Remover'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingRight: spacing.lg,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: colors.ink,
  },
  role: {
    marginTop: 2,
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  remove: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.dangerSoft,
  },
  removeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
});
