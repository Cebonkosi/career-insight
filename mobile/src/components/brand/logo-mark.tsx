import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { StyleSheet } from 'react-native';

import { BrandGradient } from '@/constants/theme';

/** The rounded gradient tile with sparkles that sits beside "Career Insight". */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <LinearGradient
      colors={BrandGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.tile, { width: size, height: size, borderRadius: size * 0.28 }]}>
      <Sparkles color="#FFFFFF" size={size * 0.56} strokeWidth={2} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
