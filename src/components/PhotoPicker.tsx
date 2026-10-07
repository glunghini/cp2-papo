import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme';
import { pickImage, type ImageSource } from '../utils/imagePicker';
import { Avatar } from './Avatar';

type Props = {
  uri: string | null;
  variant: 'user' | 'group';
  onPicked: (uri: string) => void;
  disabled?: boolean;
  label?: string;
};

export function PhotoPicker({ uri, variant, onPicked, disabled = false, label = 'Escolher foto' }: Props) {
  const handlePick = async (source: ImageSource) => {
    try {
      const result = await pickImage(source);
      if (result.status === 'picked') {
        onPicked(result.uri);
      } else if (result.status === 'denied') {
        Alert.alert(
          'Permissão necessária',
          source === 'camera'
            ? 'Libere o acesso à câmera nas configurações para tirar a foto.'
            : 'Libere o acesso às fotos nas configurações para escolher uma imagem.',
          [
            { text: 'Agora não', style: 'cancel' },
            { text: 'Abrir configurações', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    } catch {
      Alert.alert('Não foi possível abrir a imagem', 'Tente escolher outra foto.');
    }
  };

  const openOptions = () => {
    Alert.alert('Foto', 'De onde vem a imagem?', [
      { text: 'Galeria', onPress: () => void handlePick('library') },
      { text: 'Câmera', onPress: () => void handlePick('camera') },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.container}>
      <Avatar uri={uri} size={96} variant={variant} />
      <Pressable
        onPress={openOptions}
        disabled={disabled}
        hitSlop={8}
        accessibilityRole="button"
        style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}
      >
        <Text style={styles.buttonLabel}>{uri ? 'Trocar foto' : label}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  button: {
    marginTop: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buttonLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  dimmed: {
    opacity: 0.6,
  },
});
