import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';
import type { PublicUser } from '../types/user';
import { Avatar } from './Avatar';

type Props = {
  user: PublicUser;
  onPress: () => void;
  selectable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  note?: string;
};

export function UserItem({ user, onPress, selectable = false, selected = false, disabled = false, note }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={selectable ? 'checkbox' : 'button'}
      accessibilityState={{ checked: selectable ? selected : undefined, disabled }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Avatar uri={user.photoUrl} size={44} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
      {selectable ? (
        <View style={[styles.check, selected && styles.checkSelected]}>
          {selected ? <View style={styles.checkDot} /> : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  pressed: {
    backgroundColor: colors.background,
  },
  disabled: {
    opacity: 0.45,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    color: colors.ink,
  },
  note: {
    marginTop: 2,
    fontSize: 13,
    color: colors.inkMuted,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: colors.onPrimary,
  },
});
