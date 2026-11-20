import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text } from 'react-native';

import { BrandGradient, Fonts } from '@/constants/theme';

type GradientAvatarProps = {
  name: string;
  imageUrl?: string | null;
  size?: number;
};

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

/** Circle with the brand gradient and initials, or the image when there is one. */
export function GradientAvatar({ name, imageUrl, size = 40 }: GradientAvatarProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (imageUrl) {
    return <Image source={imageUrl} style={shape} contentFit="cover" accessibilityLabel={name} />;
  }

  return (
    <LinearGradient
      colors={BrandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.center, shape]}>
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initials(name)}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontFamily: Fonts.semibold,
  },
});
