import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarDays, ChevronRight, FileText } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Tag } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { BottomTabInset, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, errorMessage, formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listMyApplications } from '@/services/opportunities';
import type { Application } from '@/types/models';

function ApplicationCard({ application }: { application: Application }) {
  const theme = useTheme();
  const deadline = deadlineLabel(application.deadline);

  function handlePress() {
    if (application.opportunity_id) {
      router.push({ pathname: '/opportunity/[id]', params: { id: application.opportunity_id } });
    } else if (application.form_url) {
      // The opportunity was deleted; the form itself is still worth reopening.
      WebBrowser.openBrowserAsync(application.form_url);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.titleRow}>
        <FileText color={theme.primary} size={24} strokeWidth={1.5} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {application.opportunity_title ?? 'Untitled opportunity'}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {[application.organization_name, `Downloaded ${formatDate(application.download_date)}`]
              .filter(Boolean)
              .join(' · ')}
          </ThemedText>
        </View>
        <ChevronRight color={theme.textSecondary} size={20} />
      </View>

      <View style={styles.tags}>
        <Tag label={opportunityTypeLabel(application.opportunity_type)} />
      </View>

      {deadline && (
        <View style={[styles.deadline, { borderColor: theme.border }]}>
          <CalendarDays color={deadline.closed ? theme.textMuted : theme.warning} size={16} />
          <ThemedText type="small" themeColor={deadline.closed ? 'textMuted' : 'warning'}>
            {deadline.text}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

export default function DownloadsScreen() {
  const theme = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;

  const query = useQuery({
    queryKey: queryKeys.applications(userId),
    queryFn: () => listMyApplications(userId),
  });

  return (
    <TabScreen>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ApplicationCard application={item} />}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListHeaderComponent={
          <ScreenIntro
            title="My forms."
            subtitle="Forms you download land here, so you never lose track of a deadline."
          />
        }
        ListEmptyComponent={
          query.isPending ? (
            <ActivityIndicator style={styles.loading} color={theme.primary} />
          ) : query.isError ? (
            <EmptyState
              title="Couldn't load your forms"
              description={errorMessage(query.error, 'Pull down to try again.')}
            />
          ) : (
            <EmptyState
              title="No forms yet"
              description="Open an opportunity and tap Download application form to get started."
            />
          )
        }
        ListFooterComponent={
          query.data?.length ? (
            <ThemedText type="caption" themeColor="textSecondary">
              Submit completed forms through the channel each opportunity lists.
            </ThemedText>
          ) : undefined
        }
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
  card: {
    gap: Spacing.three - 4,
    padding: Spacing.three + 2,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  flex: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three - 4,
    borderTopWidth: 1,
  },
  loading: {
    paddingVertical: Spacing.six,
  },
});
