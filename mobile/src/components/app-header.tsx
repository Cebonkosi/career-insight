import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { LogoMark } from '@/components/brand/logo-mark';
import { OfflineBanner } from '@/components/offline-banner';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-keys';
import { countUnread } from '@/services/notifications';
import type { UserProfile } from '@/types/models';

function spaceLabel(profile: UserProfile) {
  if (profile.role === 'contributor') return profile.contributor_type === 'tutor' ? 'Tutor space' : 'Contributor space';
  return { student: 'Student space', parent: 'Parent space', admin: 'Admin space' }[profile.role];
}

type AppHeaderProps = {
  /** Shows a back arrow in place of the logo, for pushed screens. */
  back?: boolean;
  /** Replaces the bell + avatar on the right, e.g. a bookmark button. */
  right?: ReactNode;
};

function NotificationBell() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { data: unread = 0 } = useQuery({
    queryKey: queryKeys.unreadCount(userId ?? ''),
    queryFn: () => countUnread(userId!),
    enabled: Boolean(userId),
    refetchInterval: 60_000,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `Notifications, ${unread} unread` : 'Notifications'}
      hitSlop={10}
      onPress={() => router.push('/notifications')}>
      <Bell color={theme.text} size={22} />
      {unread > 0 && (
        <View style={[styles.badge, { backgroundColor: theme.danger, borderColor: theme.backgroundElement }]}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** The white bar from the mockups: logo, "Career Insight", the user's space, bell and avatar. */
export function AppHeader({ back, right }: AppHeaderProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  return (
    <View>
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
              {spaceLabel(profile)}
            </ThemedText>
          )}
        </View>

        {right ?? (
          <View style={styles.actions}>
            <NotificationBell />
            {profile && (
              <Pressable accessibilityRole="button" accessibilityLabel="Your profile" onPress={() => router.navigate('/profile')}>
                <GradientAvatar name={profile.display_name} imageUrl={profile.avatar_url} size={38} />
              </Pressable>
            )}
          </View>
        )}
      </View>
      <OfflineBanner />
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
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: Fonts.bold,
    fontSize: 10,
  },
});
