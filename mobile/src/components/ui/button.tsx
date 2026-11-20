import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  icon?: LucideIcon;
  loading?: boolean;
};

export function Button({ title, variant = 'primary', icon: Icon, loading, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const filled = variant === 'primary' || variant === 'danger';
  const textColor = filled ? theme.onPrimary : theme.primary;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={(state) => [
        styles.base,
        variant === 'primary' && { backgroundColor: theme.primary },
        variant === 'danger' && { backgroundColor: theme.danger },
        variant === 'outline' && {
          borderWidth: 1,
          borderColor: theme.border,
          backgroundColor: theme.backgroundElement,
        },
        (disabled || loading) && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {Icon && <Icon color={textColor} size={18} strokeWidth={2} />}
          <Text style={[styles.label, { color: textColor }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  label: {
    fontFamily: Fonts.semibold,
    fontSize: 15,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
