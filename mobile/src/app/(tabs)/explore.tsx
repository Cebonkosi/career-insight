import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react-native';
import { useDeferredValue, useState, type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { OpportunityCard } from '@/components/opportunities/opportunity-card';
import { ProfileRow } from '@/components/profiles/profile-tile';
import { QueryState } from '@/components/query-state';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Segmented } from '@/components/ui/segmented';
import { OPPORTUNITY_TYPES } from '@/constants/options';
import { BottomTabInset, Fonts, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSavedOpportunities } from '@/hooks/use-saved-opportunities';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import {
  OPPORTUNITIES_PAGE_SIZE,
  listOpportunities,
  type OpportunityFilters,
  type OpportunitySort,
} from '@/services/opportunities';
import { searchProfiles } from '@/services/profile';
import type { OpportunityType } from '@/types/models';

const SORT_LABELS: Record<OpportunitySort, string> = {
  closing_soon: 'Closing soon',
  newest: 'Newest',
};

type ExploreMode = 'opportunities' | 'people';

const MODES: { value: ExploreMode; label: string }[] = [
  { value: 'opportunities', label: 'Opportunities' },
  { value: 'people', label: 'People' },
];

/** Explore tab: opportunity browsing (default) or contributor/tutor search (UAT NAV-004/005). */
export default function ExploreScreen() {
  const [mode, setMode] = useState<ExploreMode>('opportunities');
  const modeSwitch = <Segmented options={MODES} value={mode} onChange={setMode} />;

  return (
    <TabScreen>
      {mode === 'opportunities' ? (
        <OpportunitiesBrowse modeSwitch={modeSwitch} />
      ) : (
        <PeopleSearch modeSwitch={modeSwitch} />
      )}
    </TabScreen>
  );
}

function PeopleSearch({ modeSwitch }: { modeSwitch: ReactNode }) {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const term = useDeferredValue(search.trim());
  const query = useQuery({
    queryKey: queryKeys.profileSearch(term),
    queryFn: () => searchProfiles(term),
    placeholderData: keepPreviousData,
  });

  return (
    <FlatList
      data={query.data ?? []}
      keyExtractor={(item) => item.user_id}
      renderItem={({ item }) => <ProfileRow card={item} />}
      contentContainerStyle={styles.list}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={styles.header}>
          {modeSwitch}
          <ScreenIntro title="Find your people." subtitle="Institutions, professionals and tutors sharing what they know." />
          <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
            <Search color={theme.textSecondary} size={20} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search contributors and tutors"
              placeholderTextColor={theme.textMuted}
              returnKeyType="search"
              accessibilityLabel="Search contributors and tutors"
              style={[styles.searchInput, { color: theme.text }]}
            />
          </View>
        </View>
      }
      ListEmptyComponent={
        query.isPending || query.isError ? (
          <QueryState isPending={query.isPending} error={query.error} onRetry={() => query.refetch()} label="profiles" />
        ) : (
          <EmptyState
            title={term ? `No one matches "${term}"` : 'No contributors yet'}
            description={term ? 'Try a different name or organisation.' : 'Check back soon.'}
          />
        )
      }
    />
  );
}

/** "Opportunities browse" mockup. */
function OpportunitiesBrowse({ modeSwitch }: { modeSwitch: ReactNode }) {
  const theme = useTheme();
  const { profile } = useAuth();
  const { savedIds, isSaved, toggleSaved } = useSavedOpportunities();

  const [search, setSearch] = useState('');
  const [type, setType] = useState<OpportunityType | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const [myGrade, setMyGrade] = useState(Boolean(profile?.grade));
  const [myProvince, setMyProvince] = useState(false);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<OpportunitySort>('closing_soon');

  const filters: OpportunityFilters = {
    // Defer the search term so typing stays responsive while the list refetches.
    search: useDeferredValue(search),
    type,
    grade: myGrade ? (profile?.grade ?? null) : null,
    province: myProvince ? (profile?.province ?? null) : null,
    ids: savedOnly ? savedIds : null,
    sort,
  };

  const query = useInfiniteQuery({
    queryKey: queryKeys.opportunities(filters),
    queryFn: ({ pageParam }) => listOpportunities(filters, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.rows.length === OPPORTUNITIES_PAGE_SIZE ? lastPageParam + 1 : undefined,
  });

  const opportunities = query.data?.pages.flatMap((page) => page.rows) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;
  const filtered = Boolean(search || type || savedOnly || (myGrade && profile?.grade) || myProvince);

  const header = (
    <View style={styles.header}>
      {modeSwitch}
      <ScreenIntro title="Open doors." subtitle="Funding and real-world experience, all in one place." />

      <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Search color={theme.textSecondary} size={20} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search opportunities or organisations"
          placeholderTextColor={theme.textMuted}
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showFilters ? 'Hide filters' : 'Show filters'}
          hitSlop={10}
          onPress={() => setShowFilters((v) => !v)}>
          <SlidersHorizontal color={showFilters ? theme.primary : theme.text} size={20} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" selected={type === null} onPress={() => setType(null)} />
        {OPPORTUNITY_TYPES.map((t) => (
          <Chip
            key={t.value}
            label={t.plural}
            selected={type === t.value}
            onPress={() => setType(type === t.value ? null : t.value)}
          />
        ))}
      </ScrollView>

      {showFilters && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {profile?.grade && (
            <Chip label={`Grade ${profile.grade}`} selected={myGrade} onPress={() => setMyGrade((v) => !v)} />
          )}
          {profile?.province && (
            <Chip label={profile.province} selected={myProvince} onPress={() => setMyProvince((v) => !v)} />
          )}
          <Chip label={`Saved (${savedIds.length})`} selected={savedOnly} onPress={() => setSavedOnly((v) => !v)} />
        </ScrollView>
      )}

      <Card style={styles.banner}>
        <ThemedText type="smallBold">A head start for your next chapter</ThemedText>
        <ThemedText type="small">
          Some bursaries open well before Grade 12. Save them now and get ready before applications open.
        </ThemedText>
      </Card>

      <View style={styles.countRow}>
        <ThemedText type="smallBold">
          {query.isPending ? 'Loading…' : `${total} ${total === 1 ? 'opportunity' : 'opportunities'}`}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort: ${SORT_LABELS[sort]}`}
          style={styles.sort}
          onPress={() => setSort(sort === 'closing_soon' ? 'newest' : 'closing_soon')}>
          <ThemedText type="small">{SORT_LABELS[sort]}</ThemedText>
          <ChevronDown color={theme.text} size={14} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      <FlatList
        data={opportunities}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OpportunityCard opportunity={item} saved={isSaved(item.id)} onToggleSaved={() => toggleSaved(item)} />
        )}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
              description={filtered ? 'Try a different search or filter.' : 'Check back soon.'}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            {query.isFetchingNextPage && <ActivityIndicator color={theme.primary} />}
            <ThemedText type="caption" themeColor="textSecondary">
              Always check the provider&apos;s official requirements before applying.
            </ThemedText>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    minHeight: 50,
    borderWidth: 1,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    marginTop: Spacing.two,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
  chips: {
    gap: Spacing.one,
  },
  banner: {
    gap: Spacing.one,
    paddingVertical: Spacing.three - 2,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.two,
  },
  sort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  loading: {
    paddingVertical: Spacing.six,
  },
  footer: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
});
