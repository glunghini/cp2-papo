import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';

type Props = {
  label?: string;
};

export function Loading({ label }: Props) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  label: {
    marginTop: spacing.md,
    fontSize: 15,
    color: colors.inkMuted,
  },
});
