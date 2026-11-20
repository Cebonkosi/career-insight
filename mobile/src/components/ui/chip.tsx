import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Unselected chips are plain text in the mockups; set to draw an outline instead. */
  outlined?: boolean;
  trailingIcon?: LucideIcon;
};

/** Filter pill: solid purple when selected, plain or outlined text otherwise. */
export function Chip({ label, selected, onPress, outlined, trailingIcon: Icon }: ChipProps) {
  const theme = useTheme();
  const color = selected ? theme.onPrimary : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: theme.primary, borderColor: theme.primary },
        !selected && outlined && { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color }]}>{label}</Text>
        {Icon && <Icon color={color} size={14} strokeWidth={2.25} />}
      </View>
    </Pressable>
  );
}

type TagProps = {
  label: string;
  /** solid = purple fill (type), outline = grey pill (value), soft = tinted text-only, warning = orange tint. */
  tone?: 'solid' | 'outline' | 'soft' | 'warning';
};

/** Non-interactive pill, e.g. "Scholarship" or "R15,000 once-off". */
export function Tag({ label, tone = 'solid' }: TagProps) {
  const theme = useTheme();
  const toneStyle = {
    solid: { backgroundColor: theme.primary, borderColor: theme.primary, color: theme.onPrimary },
    outline: { backgroundColor: theme.backgroundSelected, borderColor: theme.backgroundSelected, color: theme.textSecondary },
    soft: { backgroundColor: theme.primarySoft, borderColor: theme.primarySoft, color: theme.primary },
    warning: { backgroundColor: theme.warningSoft, borderColor: theme.warningSoft, color: theme.warning },
  }[tone];

  return <Text style={[styles.tag, toneStyle]}>{label}</Text>;
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.three - 4,
    paddingVertical: Spacing.two + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  label: {
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  tag: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.chip,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
    fontFamily: Fonts.semibold,
    fontSize: 12,
  },
});
