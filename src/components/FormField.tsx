import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, radius, spacing } from '../theme';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

export const FormField = forwardRef<TextInput, Props>(function FormField(
  { label, error, hint, style, ...inputProps },
  ref,
) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={colors.inkSoft}
        style={[styles.input, error ? styles.inputError : null, style]}
        accessibilityLabel={label}
        {...inputProps}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.danger,
  },
  hint: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: colors.inkMuted,
  },
});
