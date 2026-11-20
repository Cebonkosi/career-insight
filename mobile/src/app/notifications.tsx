import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Bell, Briefcase, CheckCheck, Heart, MessageCircle, Radio, UserPlus } from 'lucide-react-native';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { QueryState } from '@/components/query-state';
import { ScreenIntro } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { timeAgo } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listNotifications, markRead } from '@/services/notifications';
import type { AppNotification } from '@/types/models';

const ICONS = {
  opportunity: Briefcase,
  comment: MessageCircle,
  like: Heart,
  follow: UserPlus,
  system: Radio,
  mention: Bell,
} as const;

/** Only links into the app's own screens are followed (database-written paths like /opportunity/<id>). */
function safeHref(link: string | null): Href | null {
  if (!link || !/^\/(opportunity|post|live|profile)(\/[\w-]+)?$/.test(link)) return null;
  return link as Href;
}

/** In-app notification centre behind the bell (UAT NOT-001…003). */
export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;

  const query = useQuery({ queryKey: queryKeys.notifications(userId), queryFn: () => listNotifications(userId) });
  const unreadIds = (query.data ?? []).filter((n) => !n.read).map((n) => n.id);

  const mark = useMutation({
    mutationFn: markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  function openNotification(n: AppNotification) {
    if (!n.read) mark.mutate([n.id]);
    const href = safeHref(n.link);
    if (href) router.push(href);
  }

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back right={<View />} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + Spacing.five }]}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenIntro title="Notifications." />
            {unreadIds.length > 0 && (
              <Button title="Mark all as read" variant="outline" icon={CheckCheck} onPress={() => mark.mutate(unreadIds)} />
            )}
          </View>
        }
        renderItem={({ item }) => {
          const Icon = ICONS[item.type] ?? Bell;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? '' : 'Unread. '}${item.title}`}
              onPress={() => openNotification(item)}
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: item.read ? theme.backgroundElement : theme.primarySoft,
                  borderColor: theme.border,
                },
                pressed && styles.pressed,
              ]}>
              <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
                <Icon color={theme.primary} size={18} />
              </View>
              <View style={styles.flex}>
                <ThemedText type="smallBold">{item.title}</ThemedText>
                {item.message ? (
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                    {item.message}
                  </ThemedText>
                ) : null}
                <ThemedText type="caption" themeColor="textMuted">
                  {[item.actor_name, timeAgo(item.created_at)].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          query.isPending || query.isError ? (
            <QueryState isPending={query.isPending} error={query.error} onRetry={() => query.refetch()} label="notifications" />
          ) : (
            <EmptyState
              title="You're all caught up"
              description="We'll let you know about new opportunities, live sessions and replies to your posts."
            />
          )
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  list: {
    gap: Spacing.two,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
