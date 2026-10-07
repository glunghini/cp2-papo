import { Pressable, StyleSheet, Text, View } from 'react-native';

import { NOTIFICATION_POLICY_OPTIONS } from '../constants/notificationPolicies';
import { colors, radius, spacing } from '../theme';
import type { NotificationPolicy } from '../types/group';

type Props = {
  value: NotificationPolicy;
  onChange: (policy: NotificationPolicy) => void;
  disabled?: boolean;
};

export function PolicySelector({ value, onChange, disabled = false }: Props) {
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {NOTIFICATION_POLICY_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.texts}>
              <Text style={styles.label}>{option.label}</Text>
              <Text style={styles.description}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.8,
  },
  radio: {
    width: 20,
    height: 20,
    marginTop: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  texts: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  description: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkMuted,
  },
});
