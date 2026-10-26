import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, errorMessage, formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listMyApplications } from '@/services/opportunities';
import type { Application } from '@/types/models';

function ApplicationRow({ application }: { application: Application }) {
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
      <View style={styles.badges}>
        <Badge label={opportunityTypeLabel(application.opportunity_type)} />
        {deadline && <Badge label={deadline.text} tone={deadline.urgent ? 'danger' : 'muted'} />}
      </View>
      <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
        {application.opportunity_title ?? 'Untitled opportunity'}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {[application.organization_name, `Downloaded ${formatDate(application.download_date)}`]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
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
    <TabScreen title="My forms">
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ApplicationRow application={item} />}
        contentContainerStyle={styles.list}
        refreshing={query.isRefetching}
        onRefresh={() => query.refetch()}
        ListHeaderComponent={
          <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
            Forms you download appear here so you can track deadlines. Submit completed forms through
            the channel each opportunity lists.
          </ThemedText>
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
              description="Open an opportunity and tap Download form to get started."
            />
          )
        }
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  hint: {
    marginBottom: Spacing.two,
  },
  card: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  loading: {
    paddingVertical: Spacing.six,
  },
});
