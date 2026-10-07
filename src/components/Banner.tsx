import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Tone = 'info' | 'warning' | 'error';

type Props = {
  message: string;
  tone?: Tone;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
};

const toneStyles: Record<Tone, { background: string; text: string }> = {
  info: { background: colors.primarySoft, text: colors.primary },
  warning: { background: colors.warningSoft, text: colors.warning },
  error: { background: colors.dangerSoft, text: colors.danger },
};

export function Banner({ message, tone = 'info', actionLabel, onAction, onDismiss }: Props) {
  const palette = toneStyles[tone];
  return (
    <View
      style={[styles.container, { backgroundColor: palette.background }]}
      accessibilityRole={tone === 'error' ? 'alert' : 'text'}
    >
      <Text style={[styles.message, { color: palette.text }]}>{message}</Text>
      <View style={styles.actions}>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.action, { color: palette.text }]}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8} accessibilityRole="button" accessibilityLabel="Fechar aviso">
            <Text style={[styles.action, { color: palette.text }]}>Fechar</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.lg,
  },
  action: {
    marginTop: spacing.xs,
    fontSize: 14,
    fontWeight: '700',
  },
});
