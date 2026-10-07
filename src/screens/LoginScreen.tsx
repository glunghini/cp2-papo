import { useCallback, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormField } from '../components/FormField';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, spacing } from '../theme';
import type { AuthScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { isValidEmail } from '../utils/validation';

type FieldErrors = { email?: string; password?: string };

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const nextErrors: FieldErrors = {};
    if (!isValidEmail(email)) nextErrors.email = 'Informe um e-mail válido.';
    if (password.length === 0) nextErrors.password = 'Informe a senha.';
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await signIn({ email, password });
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível entrar. Tente de novo.'));
      setSubmitting(false);
    }
  }, [email, password, signIn]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.xxl * 2 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Papo</Text>
        <Text style={styles.tagline}>Conversas individuais e em grupo, com aviso na hora.</Text>

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FormField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <FormField
          ref={passwordRef}
          label="Senha"
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />

        <PrimaryButton label="Entrar" onPress={() => void handleSubmit()} loading={submitting} />
        <View style={styles.footer}>
          <Text style={styles.footerText}>Ainda não tem conta?</Text>
          <PrimaryButton
            label="Criar conta"
            variant="text"
            compact
            onPress={() => navigation.navigate('Register')}
            disabled={submitting}
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  brand: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.primary,
  },
  tagline: {
    marginTop: spacing.xs,
    marginBottom: spacing.xxl,
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkMuted,
  },
  errorBox: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 15,
    color: colors.inkMuted,
  },
});
