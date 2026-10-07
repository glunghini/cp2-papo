import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, type ImageSourcePropType } from 'react-native';

import { colors } from '../theme';

const DEFAULT_USER_IMAGE: ImageSourcePropType = require('../../assets/default-avatar.png');
const DEFAULT_GROUP_IMAGE: ImageSourcePropType = require('../../assets/default-group.png');

type Props = {
  uri: string | null;
  size?: number;
  variant?: 'user' | 'group';
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Avatar({ uri, size = 44, variant = 'user', onPress, accessibilityLabel }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const fallback = variant === 'group' ? DEFAULT_GROUP_IMAGE : DEFAULT_USER_IMAGE;
  const source = uri && !failed ? { uri } : fallback;
  // grupos usam canto arredondado em vez de círculo para diferenciar na lista
  const borderRadius = variant === 'group' ? size * 0.28 : size / 2;

  const image = (
    <Image
      source={source}
      onError={() => setFailed(true)}
      style={[styles.image, { width: size, height: size, borderRadius }]}
      accessibilityIgnoresInvertColors
    />
  );

  if (!onPress) return image;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {image}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    opacity: 0.7,
  },
});
