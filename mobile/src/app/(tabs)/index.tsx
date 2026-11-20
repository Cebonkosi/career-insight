import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApprovalBanner } from '@/components/approval-banner';
import { EmptyState } from '@/components/empty-state';
import { OpportunityCoverCard } from '@/components/opportunities/opportunity-cover-card';
import { PostCard } from '@/components/posts/post-card';
import { ProfileTile } from '@/components/profiles/profile-tile';
import { QueryState } from '@/components/query-state';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFollowing } from '@/hooks/use-following';
import { usePostLikes } from '@/hooks/use-post-likes';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';
import { queryKeys } from '@/lib/query-keys';
import { listLatestOpportunities } from '@/services/opportunities';
import { POSTS_PAGE_SIZE, listPosts, type FeedScope } from '@/services/posts';
import { searchProfiles } from '@/services/profile';

type FeedTab = 'for_you' | 'following';

const FEED_TABS: { value: FeedTab; label: string }[] = [
  { value: 'for_you', label: 'For you' },
  { value: 'following', label: 'Following' },
];

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="heading">{title}</ThemedText>
      {actionLabel && (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8} style={styles.inline}>
          <ThemedText type="link">{actionLabel}</ThemedText>
          <ArrowRight color={theme.primary} size={14} />
        </Pressable>
      )}
    </View>
  );
}

function greeting(role: string | undefined, name: string) {
  const first = name.split(' ')[0];
  if (role === 'parent') return { title: 'Support their next step.', subtitle: `Welcome, ${first}. Explore possibilities together.` };
  if (role === 'contributor' || role === 'admin') {
    return { title: 'Make an impact.', subtitle: `Hi ${first}. Your stories can help a learner find their next step.` };
  }
  return { title: 'Your future starts here.', subtitle: `Hi ${first}. Let's turn your curiosity into a plan.` };
}

/** Home: opportunity and people rows (UAT NAV-007, OPP-010) above the community feed. */
export default function HomeScreen() {
  const { profile, session } = useAuth();
  const { isLearner } = useRole();
  const [tab, setTab] = useState<FeedTab>('for_you');
  const { followingIds } = useFollowing();

  const opportunities = useQuery({ queryKey: queryKeys.latestOpportunities, queryFn: () => listLatestOpportunities() });
  const people = useQuery({ queryKey: queryKeys.profileSearch(''), queryFn: () => searchProfiles('', 12) });

  const scope: FeedScope = tab === 'following' ? { kind: 'following', authorIds: followingIds } : { kind: 'all' };
  const feed = useInfiniteQuery({
    queryKey: queryKeys.feed(tab === 'following' ? `following:${followingIds.join(',')}` : 'all'),
    queryFn: ({ pageParam }) => listPosts(scope, pageParam, session?.user.id),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastParam) => (last.length === POSTS_PAGE_SIZE ? lastParam + 1 : undefined),
  });
  const posts = feed.data?.pages.flat() ?? [];
  const { isLiked, toggleLike } = usePostLikes(posts);

  const intro = greeting(profile?.role, profile?.display_name ?? '');
  const otherPeople = (people.data ?? []).filter((card) => card.user_id !== session?.user.id);

  const header = (
    <View style={styles.header}>
      <ScreenIntro title={intro.title} subtitle={intro.subtitle} />
      <ApprovalBanner />

      <View style={styles.section}>
        <SectionHeader
          title={isLearner ? "Don't miss these" : 'Latest opportunities'}
          actionLabel={isLearner ? 'Explore' : undefined}
          onAction={() => router.navigate('/explore')}
        />
        {opportunities.data?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {opportunities.data.map((opp) => (
              <OpportunityCoverCard key={opp.id} opportunity={opp} />
            ))}
          </ScrollView>
        ) : opportunities.isPending || opportunities.isError ? (
          <QueryState
            isPending={opportunities.isPending}
            error={opportunities.error}
            onRetry={() => opportunities.refetch()}
            label="opportunities"
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            New opportunities will appear here as soon as they&apos;re published.
          </ThemedText>
        )}
      </View>

      {otherPeople.length > 0 && (
        <View style={styles.section}>
          <SectionHeader title="People to follow" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {otherPeople.map((card) => (
              <ProfileTile key={card.user_id} card={card} />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <SectionHeader title="From your community" />
        <Segmented options={FEED_TABS} value={tab} onChange={setTab} />
      </View>
    </View>
  );

  return (
    <TabScreen>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <PostCard post={item} liked={isLiked(item.id)} onToggleLike={() => toggleLike(item.id)} />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshing={feed.isRefetching && !feed.isFetchingNextPage}
        onRefresh={() => {
          feed.refetch();
          opportunities.refetch();
          people.refetch();
        }}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
        }}
        ListEmptyComponent={
          feed.isPending || feed.isError ? (
            <QueryState isPending={feed.isPending} error={feed.error} onRetry={() => feed.refetch()} label="posts" />
          ) : tab === 'following' ? (
            <EmptyState
              title={followingIds.length ? 'Nothing new from people you follow' : "You're not following anyone yet"}
              description="Follow contributors and tutors from People to follow or Explore → People."
            />
          ) : (
            <EmptyState title="No posts yet" description="Be the first to share something with the community." />
          )
        }
        ListFooterComponent={feed.isFetchingNextPage ? <QueryState isPending label="more posts" /> : undefined}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.four,
    marginBottom: Spacing.one,
  },
  section: {
    gap: Spacing.three - 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  row: {
    gap: Spacing.three - 4,
    paddingRight: Spacing.four,
  },
});
