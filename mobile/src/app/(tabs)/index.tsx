import { useInfiniteQuery } from '@tanstack/react-query';
import { useDeferredValue, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { OpportunityRow } from '@/components/opportunities/opportunity-row';
import { TabScreen } from '@/components/tab-screen';
import { Chip } from '@/components/ui/chip';
import { OPPORTUNITY_TYPES } from '@/constants/options';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { OPPORTUNITIES_PAGE_SIZE, listOpportunities } from '@/services/opportunities';
import type { OpportunityType } from '@/types/models';

export default function OpportunitiesScreen() {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [type, setType] = useState<OpportunityType | null>(null);
  // Defer the search term so typing stays responsive while the list refetches.
  const filters = { search: useDeferredValue(search), type };

  const query = useInfiniteQuery({
    queryKey: queryKeys.opportunities(filters),
    queryFn: ({ pageParam }) => listOpportunities(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === OPPORTUNITIES_PAGE_SIZE ? lastPageParam + 1 : undefined,
  });

  const opportunities = query.data?.pages.flat() ?? [];

  return (
    <TabScreen title="Opportunities">
      <View style={styles.controls}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bursaries, internships, organisations…"
          placeholderTextColor={theme.textSecondary}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[
            styles.search,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" selected={type === null} onPress={() => setType(null)} />
          {OPPORTUNITY_TYPES.map((t) => (
            <Chip
              key={t.value}
              label={t.label}
              selected={type === t.value}
              onPress={() => setType(type === t.value ? null : t.value)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={opportunities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OpportunityRow opportunity={item} />}
        contentContainerStyle={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        refreshing={query.isRefetching && !query.isFetchingNextPage}
        onRefresh={() => query.refetch()}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
        }}
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator style={styles.loading} color={theme.primary} />
          ) : query.isError ? (
            <EmptyState
              title="Couldn't load opportunities"
              description={errorMessage(query.error, 'Pull down to try again.')}
            />
          ) : (
            <EmptyState
              title="No opportunities found"
              description={search || type ? 'Try a different search or filter.' : 'Check back soon.'}
            />
          )
        }
        ListFooterComponent={
          query.isFetchingNextPage ? <ActivityIndicator color={theme.primary} /> : undefined
        }
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  controls: {
    gap: Spacing.two,
    paddingBottom: Spacing.two,
  },
  search: {
    marginHorizontal: Spacing.four,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  chips: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  loading: {
    paddingVertical: Spacing.six,
  },
});
