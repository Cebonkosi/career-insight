import { router } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { LogoMark } from '@/components/brand/logo-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import type { UserRole } from '@/types/models';

const SPACE_LABELS: Record<UserRole, string> = {
  student: 'Student space',
  parent: 'Parent space',
  contributor: 'Contributor space',
  admin: 'Admin space',
};

type AppHeaderProps = {
  /** Shows a back arrow in place of the logo, for pushed screens. */
  back?: boolean;
  /** Replaces the bell + avatar on the right, e.g. a bookmark button. */
  right?: ReactNode;
};

/** The white bar from the mockups: logo, "Career Insight", the user's space, bell and avatar. */
export function AppHeader({ back, right }: AppHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  return (
    <View
      style={[
        styles.bar,
        { paddingTop: insets.top + Spacing.two, backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      {back ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <ArrowLeft color={theme.text} size={24} />
        </Pressable>
      ) : (
        <LogoMark />
      )}

      <View style={styles.titles}>
        <ThemedText type="defaultMedium" style={styles.brand}>
          Career Insight
        </ThemedText>
        {profile && (
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {SPACE_LABELS[profile.role]}
          </ThemedText>
        )}
      </View>

      {right ?? (
        <View style={styles.actions}>
          <Bell color={theme.text} size={22} />
          {profile && <GradientAvatar name={profile.display_name} imageUrl={profile.avatar_url} size={38} />}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titles: {
    flex: 1,
  },
  brand: {
    fontSize: 17,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
  },
});
