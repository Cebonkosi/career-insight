/**
 * Design tokens for Career Insight, taken from the mockups in the design set
 * (Downloads/Career Insight). The mockups are light-only; the dark palette
 * keeps the same hues for users whose phone is in dark mode.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#161823',
    background: '#F7F8FB',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#F1F2F6',
    textSecondary: '#5E6472',
    textMuted: '#8A90A0',
    border: '#E3E6EC',
    primary: '#5B43D6',
    primarySoft: '#EEEBFC',
    onPrimary: '#FFFFFF',
    accent: '#14B8A6',
    warning: '#C2510F',
    warningSoft: '#FDF1E7',
    danger: '#E5484D',
  },
  dark: {
    text: '#F4F4F7',
    background: '#0F1016',
    backgroundElement: '#181A22',
    backgroundSelected: '#22242E',
    textSecondary: '#A6ABB8',
    textMuted: '#7D8292',
    border: '#2A2D38',
    primary: '#8D7AF0',
    primarySoft: '#262043',
    onPrimary: '#FFFFFF',
    accent: '#2DD4BF',
    warning: '#F59E5B',
    warningSoft: '#33231A',
    danger: '#F87171',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Blue-violet to teal, used for the logo tile and initials avatars. */
export const BrandGradient = ['#5B43D6', '#3B82F6', '#2DD4BF'] as const;

/**
 * Font families loaded in src/app/_layout.tsx. Display = headings (Space
 * Grotesk), the rest = body copy (Inter).
 */
export const Fonts = {
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_600SemiBold',
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

export const Radius = {
  chip: 999,
  control: 14,
  card: 18,
} as const;

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
