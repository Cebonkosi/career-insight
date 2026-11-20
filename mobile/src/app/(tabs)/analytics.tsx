import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApprovalBanner } from '@/components/approval-banner';
import { EmptyState } from '@/components/empty-state';
import { QueryState } from '@/components/query-state';
import { StatTile } from '@/components/stat-tile';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-keys';
import { fetchContributorAnalytics, fetchPlatformAnalytics, lastDays } from '@/services/analytics';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
] as const;

type RangeValue = (typeof RANGES)[number]['value'];

function DownloadNote() {
  return (
    <ThemedText type="caption" themeColor="textMuted">
      A download means a learner saved the form to their device. It is not proof that an application was
      completed or submitted — that happens with the provider.
    </ThemedText>
  );
}

function PlatformView({ days }: { days: number }) {
  const query = useQuery({
    queryKey: queryKeys.analytics('platform', days),
    queryFn: () => fetchPlatformAnalytics(lastDays(days)),
  });
  const d = query.data;
  if (!d) return <QueryState isPending={query.isPending} error={query.error} onRetry={() => query.refetch()} label="analytics" />;

  return (
    <View style={styles.stack}>
      <View style={styles.grid}>
        <StatTile label="Opportunity views" value={d.views} />
        <StatTile label="Form downloads" value={d.downloads} note="download events" />
        <StatTile label="Unique downloaders" value={d.unique_downloaders} note="distinct learners" />
        <StatTile label="Live session joins" value={d.live_viewers} />
        <StatTile label="New students" value={d.new_students} />
        <StatTile label="New parents" value={d.new_parents} />
        <StatTile label="Posts" value={d.posts} />
        <StatTile label="Comments" value={d.comments} />
      </View>
      <DownloadNote />
      <ThemedText type="caption" themeColor="textSecondary">
        Per-opportunity breakdowns and exports are in the admin web console.
      </ThemedText>
    </View>
  );
}

function ContributorView({ days }: { days: number }) {
  const theme = useTheme();
  const query = useQuery({
    queryKey: queryKeys.analytics('contributor', days),
    queryFn: () => fetchContributorAnalytics(lastDays(days)),
  });
  const d = query.data;
  if (!d) return <QueryState isPending={query.isPending} error={query.error} onRetry={() => query.refetch()} label="analytics" />;

  return (
    <View style={styles.stack}>
      <View style={styles.grid}>
        <StatTile label="Followers" value={d.followers_total} note={`+${d.new_followers} in this period`} />
        <StatTile label="Posts published" value={d.posts} />
        <StatTile label="Likes on your posts" value={d.likes} />
        <StatTile label="Comments on your posts" value={d.comments} />
        <StatTile label="Sessions hosted" value={d.sessions} />
        <StatTile label="Session viewers" value={d.session_viewers} />
      </View>

      <ThemedText type="heading">Your top posts</ThemedText>
      {d.top_posts.length ? (
        <Card style={styles.list}>
          {d.top_posts.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="link"
              onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
              style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderColor: theme.border }]}>
              <ThemedText type="small" numberOfLines={2}>
                {p.content}
              </ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {p.likes_count} likes · {p.comments_count} comments
              </ThemedText>
            </Pressable>
          ))}
        </Card>
      ) : (
        <EmptyState title="No posts yet" description="Share something from the Post tab to see engagement here." />
      )}

      <ThemedText type="heading">Your linked opportunities</ThemedText>
      {d.opportunities.length ? (
        <Card style={styles.list}>
          {d.opportunities.map((o, i) => (
            <View key={o.id} style={[styles.listRow, i > 0 && { borderTopWidth: 1, borderColor: theme.border }]}>
              <ThemedText type="smallBold">{o.title}</ThemedText>
              <ThemedText type="caption" themeColor="textMuted">
                {o.views} views · {o.downloads} downloads · {o.unique_downloaders} unique learners
              </ThemedText>
            </View>
          ))}
        </Card>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          When the Career Insight team publishes an opportunity on behalf of your organisation, its views and
          downloads appear here.
        </ThemedText>
      )}
      <DownloadNote />
    </View>
  );
}

/** Analytics tab for contributors, tutors and admins (UAT NAV-003, ANL-004/005). */
export default function AnalyticsScreen() {
  const { isAdmin, canSeeAnalytics } = useRole();
  const [range, setRange] = useState<RangeValue>('30');
  const days = Number(range);

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenIntro
          title={isAdmin ? 'Platform pulse.' : 'Your reach.'}
          subtitle={isAdmin ? 'Engagement across Career Insight.' : 'How learners engage with what you share.'}
        />
        <ApprovalBanner feature="Analytics" />
        {canSeeAnalytics && (
          <>
            <Segmented options={[...RANGES]} value={range} onChange={setRange} />
            {isAdmin ? <PlatformView days={days} /> : <ContributorView days={days} />}
          </>
        )}
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  stack: {
    gap: Spacing.three,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three - 4,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  listRow: {
    gap: Spacing.one,
    paddingVertical: Spacing.three - 4,
  },
});
