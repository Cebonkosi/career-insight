import { useQuery } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { CalendarPlus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ApprovalBanner } from '@/components/approval-banner';
import { EmptyState } from '@/components/empty-state';
import { LiveCard } from '@/components/live/live-card';
import { QueryState } from '@/components/query-state';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useRole } from '@/hooks/use-role';
import { deviceFilesSupported, downloadedRecordingIds } from '@/lib/device-files';
import { queryKeys } from '@/lib/query-keys';
import { listStreams } from '@/services/live';
import type { LiveStream } from '@/types/models';

type LiveFilter = 'now' | 'upcoming' | 'recordings' | 'downloaded';

const FILTERS: { value: LiveFilter; label: string }[] = [
  { value: 'now', label: 'Live now' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'recordings', label: 'Recordings' },
  ...(deviceFilesSupported ? [{ value: 'downloaded' as const, label: 'Downloaded' }] : []),
];

const EMPTY: Record<LiveFilter, { title: string; description: string }> = {
  now: { title: 'Nothing is live right now', description: 'Check Upcoming for scheduled sessions.' },
  upcoming: { title: 'No sessions scheduled', description: "We'll notify you when a new session is scheduled." },
  recordings: { title: 'No recordings yet', description: 'Recordings appear here after a session ends.' },
  downloaded: { title: 'No downloaded recordings', description: 'Download a recording to watch it offline.' },
};

function matches(stream: LiveStream, filter: LiveFilter, downloaded: string[]) {
  if (filter === 'now') return stream.status === 'live';
  if (filter === 'upcoming') return stream.status === 'upcoming';
  if (filter === 'recordings') return stream.status === 'ended' && Boolean(stream.recording_url);
  return downloaded.includes(stream.id);
}

/** Live tab (UAT LIVE-001…008): sessions, recordings and offline downloads. */
export default function LiveScreen() {
  const { canHostLive, isContributor } = useRole();
  const streams = useQuery({ queryKey: queryKeys.streams, queryFn: listStreams });
  const [filter, setFilter] = useState<LiveFilter>('upcoming');
  const [downloaded, setDownloaded] = useState<string[]>([]);

  // Re-read the device's saved recordings whenever the tab is shown.
  useFocusEffect(
    useCallback(() => {
      setDownloaded(downloadedRecordingIds());
    }, []),
  );

  const visible = (streams.data ?? []).filter((s) => matches(s, filter, downloaded));
  // Recordings and past sessions read newest first.
  if (filter !== 'upcoming') visible.reverse();

  return (
    <TabScreen>
      <FlatList
        data={visible}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <LiveCard stream={item} downloaded={downloaded.includes(item.id)} />}
        contentContainerStyle={styles.list}
        refreshing={streams.isRefetching}
        onRefresh={() => {
          streams.refetch();
          setDownloaded(downloadedRecordingIds());
        }}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenIntro title="Learn live." subtitle="Join sessions with institutions, professionals and tutors." />
            {canHostLive ? (
              <Button title="Schedule a session" icon={CalendarPlus} onPress={() => router.push('/live/new')} />
            ) : (
              isContributor && <ApprovalBanner feature="Hosting live sessions" />
            )}
            <Segmented options={FILTERS} value={filter} onChange={setFilter} />
          </View>
        }
        ListEmptyComponent={
          streams.isPending || streams.isError ? (
            <QueryState isPending={streams.isPending} error={streams.error} onRetry={() => streams.refetch()} label="sessions" />
          ) : (
            <EmptyState {...EMPTY[filter]} />
          )
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
  header: {
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
});
