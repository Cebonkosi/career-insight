/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// primary / accent match the web admin console's brand (web/src/index.css).
export const Colors = {
  light: {
    text: '#1C1C24',
    background: '#F8FAFB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#ECEEF6',
    textSecondary: '#6B6B76',
    border: '#E1E6EC',
    primary: '#5E44D5',
    primarySoft: '#EEEAFB',
    onPrimary: '#FFFFFF',
    accent: '#1FA592',
    danger: '#DC2626',
  },
  dark: {
    text: '#F4F4F6',
    background: '#0E0E12',
    backgroundElement: '#1A1A20',
    backgroundSelected: '#2A2833',
    textSecondary: '#A3A3AE',
    border: '#2C2C35',
    primary: '#8B76EC',
    primarySoft: '#2A2445',
    onPrimary: '#FFFFFF',
    accent: '#2BD4BD',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
