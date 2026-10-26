import { Pressable, StyleSheet, Text } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      disabled={!onPress}
      style={[
        styles.chip,
        selected
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <Text style={[styles.label, { color: selected ? theme.onPrimary : theme.text }]}>{label}</Text>
    </Pressable>
  );
}

/** Small non-interactive label, e.g. an opportunity's type. */
export function Badge({ label, tone = 'primary' }: { label: string; tone?: 'primary' | 'danger' | 'muted' }) {
  const theme = useTheme();
  const colors = {
    primary: { bg: theme.primarySoft, fg: theme.primary },
    danger: { bg: theme.backgroundSelected, fg: theme.danger },
    muted: { bg: theme.backgroundSelected, fg: theme.textSecondary },
  }[tone];

  return (
    <Text style={[styles.badge, { backgroundColor: colors.bg, color: colors.fg }]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
  },
  badge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    fontSize: 12,
    fontWeight: 700,
  },
});
