import { StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'display'
    | 'heading'
    | 'cardTitle'
    | 'default'
    | 'defaultMedium'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'eyebrow'
    | 'link'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const defaultColor = type === 'link' ? 'primary' : 'text';

  return <Text style={[{ color: theme[themeColor ?? defaultColor] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  /** Screen headline, e.g. "Open doors." */
  display: {
    fontFamily: Fonts.display,
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  /** Section heading, e.g. "Who can apply?" */
  heading: {
    fontFamily: Fonts.displayMedium,
    fontSize: 20,
    lineHeight: 26,
  },
  /** Card title, e.g. an opportunity name. */
  cardTitle: {
    fontFamily: Fonts.displayMedium,
    fontSize: 19,
    lineHeight: 25,
  },
  default: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  defaultMedium: {
    fontFamily: Fonts.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  small: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  smallBold: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  caption: {
    fontFamily: Fonts.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  /** Small uppercase label, e.g. "STUDENT SPACE · SAMPLE DATA". */
  eyebrow: {
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  link: {
    fontFamily: Fonts.semibold,
    fontSize: 14,
    lineHeight: 20,
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 12,
  },
});
