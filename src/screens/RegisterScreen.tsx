import { useCallback, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FormField } from '../components/FormField';
import { PhotoPicker } from '../components/PhotoPicker';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/useAuth';
import { colors, radius, spacing } from '../theme';
import type { AuthScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { isValidEmail, isValidPhone, maskDate, maskPhone, validateBirthDate } from '../utils/validation';

type Field = 'name' | 'email' | 'phone' | 'birthDate' | 'password' | 'confirmPassword';
type FieldErrors = Partial<Record<Field, string>>;

type FormValues = {
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
};

function validate(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.name.trim().length < 2) errors.name = 'Informe seu nome.';
  if (!isValidEmail(values.email)) errors.email = 'Informe um e-mail válido.';
  if (!isValidPhone(values.phone)) errors.phone = 'Informe o celular com DDD.';
  const birthError = validateBirthDate(values.birthDate);
  if (birthError) errors.birthDate = birthError;
  if (values.password.length < 6) errors.password = 'A senha precisa ter pelo menos 6 caracteres.';
  if (values.confirmPassword !== values.password) errors.confirmPassword = 'As senhas não são iguais.';
  return errors;
}

export function RegisterScreen(_props: AuthScreenProps<'Register'>) {
  const { signUp } = useAuth();
  const [values, setValues] = useState<FormValues>({
    name: '',
    email: '',
    phone: '',
    birthDate: '',
    password: '',
    confirmPassword: '',
  });
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback((field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async () => {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const result = await signUp({
        name: values.name,
        email: values.email,
        password: values.password,
        phoneNumber: values.phone,
        birthDate: values.birthDate,
        photoUri,
      });
      if (result.photoUploadFailed) {
        Alert.alert('Conta criada', 'A foto não pôde ser enviada agora. Você pode trocá-la depois no seu perfil.');
      }
    } catch (err) {
      setError(getErrorMessage(err, 'Não foi possível criar a conta. Tente de novo.'));
      setSubmitting(false);
    }
  }, [values, photoUri, signUp]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PhotoPicker uri={photoUri} variant="user" onPicked={setPhotoUri} disabled={submitting} label="Adicionar foto" />

        {error ? (
          <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <FormField
          label="Nome"
          value={values.name}
          onChangeText={(text) => setField('name', text)}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          maxLength={60}
        />
        <FormField
          label="E-mail"
          value={values.email}
          onChangeText={(text) => setField('email', text)}
          error={errors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <FormField
          label="Celular"
          value={values.phone}
          onChangeText={(text) => setField('phone', maskPhone(text))}
          error={errors.phone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          placeholder="(11) 98765-4321"
        />
        <FormField
          label="Data de nascimento"
          value={values.birthDate}
          onChangeText={(text) => setField('birthDate', maskDate(text))}
          error={errors.birthDate}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
        />
        <FormField
          label="Senha"
          value={values.password}
          onChangeText={(text) => setField('password', text)}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          hint="Mínimo de 6 caracteres."
        />
        <FormField
          label="Confirmar senha"
          value={values.confirmPassword}
          onChangeText={(text) => setField('confirmPassword', text)}
          error={errors.confirmPassword}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <PrimaryButton label="Criar conta" onPress={() => void handleSubmit()} loading={submitting} />
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl * 2,
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
});
