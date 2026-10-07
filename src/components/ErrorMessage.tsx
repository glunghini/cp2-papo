import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorMessage({ message, onRetry, retryLabel = 'Tentar de novo' }: Props) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.message}>{message}</Text>
      {onRetry ? <PrimaryButton label={retryLabel} onPress={onRetry} variant="secondary" compact /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  message: {
    fontSize: 15,
    color: colors.ink,
    textAlign: 'center',
    lineHeight: 22,
  },
});
