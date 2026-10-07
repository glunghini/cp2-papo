import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <PrimaryButton label={actionLabel} onPress={onAction} compact />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl * 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.ink,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkMuted,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
  },
});
