import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { File } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CalendarClock, Download, ExternalLink, Link2, Play, Square, Trash2, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { EmptyState } from '@/components/empty-state';
import { streamStatusTag } from '@/components/live/live-card';
import { RecordingPlayer } from '@/components/live/recording-player';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';
import {
  deleteRecording,
  deviceFilesSupported,
  downloadRecording,
  localRecording,
} from '@/lib/device-files';
import { errorMessage, formatDateTime } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { getStream, joinStream, updateStream } from '@/services/live';
import { UploadRejected, uploadRecording, validateAsset } from '@/services/storage';

/** Direct video files can be played in-app and downloaded; other links (YouTube…) open externally. */
function isDirectVideo(url: string) {
  return /\.(mp4|mov|m4v)(\?|$)/i.test(url);
}

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { isAdmin, canHostLive } = useRole();

  const stream = useQuery({ queryKey: queryKeys.stream(id), queryFn: () => getStream(id) });
  const [local, setLocal] = useState<File | null>(() => localRecording(id));
  const [recordingLink, setRecordingLink] = useState('');
  const [downloading, setDownloading] = useState(false);

  const data = stream.data;
  const isHost = Boolean(data && (data.host_id === session?.user.id ? canHostLive : isAdmin));

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.streams });
  }

  const update = useMutation({
    mutationFn: (changes: Parameters<typeof updateStream>[1]) => updateStream(id, changes),
    onSuccess: refresh,
    onError: (err) => Alert.alert('Could not update the session', errorMessage(err, 'Please try again.')),
  });

  async function join() {
    if (!data) return;
    try {
      await joinStream(data.id);
      refresh();
    } catch {
      // Viewer counting must never stop someone joining.
    }
    try {
      await WebBrowser.openBrowserAsync(data.stream_url);
    } catch (err) {
      Alert.alert("Couldn't open the session", errorMessage(err, 'Check your connection and try again.'));
    }
  }

  async function uploadVideo() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
    if (result.canceled || !session) return;
    try {
      validateAsset(result.assets[0], 'video');
      const url = await uploadRecording(session.user.id, result.assets[0]);
      update.mutate({ recording_url: url });
    } catch (err) {
      Alert.alert(
        err instanceof UploadRejected ? "That video can't be used" : 'Upload failed',
        errorMessage(err, 'Please try again.'),
      );
    }
  }

  async function saveOffline() {
    if (!data?.recording_url) return;
    setDownloading(true);
    try {
      setLocal(await downloadRecording(data.id, data.recording_url));
      Alert.alert('Saved for offline viewing', 'Find it under Live → Downloaded, even without internet.');
    } catch (err) {
      Alert.alert('Download failed', errorMessage(err, 'Check your connection and try again.'));
    } finally {
      setDownloading(false);
    }
  }

  function removeOffline() {
    deleteRecording(id);
    setLocal(null);
  }

  if (!data) {
    return (
      <ThemedView style={styles.flex}>
        <AppHeader back right={<View />} />
        {stream.isPending || stream.isError ? (
          <QueryState isPending={stream.isPending} error={stream.error} onRetry={() => stream.refetch()} label="this session" />
        ) : (
          <EmptyState title="Session unavailable" description="It may have been removed by the host." />
        )}
      </ThemedView>
    );
  }

  const recording = data.recording_url;
  const playable = recording && isDirectVideo(recording);
  const linkValid = /^https?:\/\/\S+$/.test(recordingLink.trim());

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back right={<View />} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <View style={styles.row}>{streamStatusTag(data)}</View>
        <ThemedText type="display">{data.title}</ThemedText>

        <View style={styles.hostRow}>
          <GradientAvatar name={data.host_name ?? 'Host'} imageUrl={data.host_avatar} size={44} />
          <View style={styles.flex}>
            <ThemedText type="defaultMedium">{data.host_name ?? 'Career Insight host'}</ThemedText>
            <ThemedText type="caption" themeColor="textMuted">
              {data.viewers_count} viewer{data.viewers_count === 1 ? '' : 's'}
            </ThemedText>
          </View>
        </View>

        {data.scheduled_date && (
          <View style={styles.row}>
            <CalendarClock color={theme.textSecondary} size={16} />
            <ThemedText type="small" themeColor="textSecondary">
              {formatDateTime(data.scheduled_date)} SAST
            </ThemedText>
          </View>
        )}

        {data.description && <ThemedText themeColor="textSecondary">{data.description}</ThemedText>}

        {/* Viewer actions */}
        {data.status === 'live' && <Button title="Join live session" icon={Play} onPress={join} />}
        {data.status === 'upcoming' && !isHost && (
          <Card>
            <ThemedText type="small" themeColor="textSecondary">
              This session hasn&apos;t started yet. We&apos;ll notify you when it goes live.
            </ThemedText>
          </Card>
        )}

        {/* Recording */}
        {data.status === 'ended' &&
          (recording ? (
            <View style={styles.section}>
              <ThemedText type="heading">Recording</ThemedText>
              {playable ? (
                <>
                  <RecordingPlayer key={local?.uri ?? recording} uri={local?.uri ?? recording} offline={Boolean(local)} />
                  {deviceFilesSupported &&
                    (local ? (
                      <Button title="Remove offline copy" variant="outline" icon={Trash2} onPress={removeOffline} />
                    ) : (
                      <Button
                        title="Download for offline viewing"
                        variant="outline"
                        icon={Download}
                        loading={downloading}
                        onPress={saveOffline}
                      />
                    ))}
                </>
              ) : (
                <>
                  <Button
                    title="Watch the recording"
                    variant="outline"
                    icon={ExternalLink}
                    onPress={() => WebBrowser.openBrowserAsync(recording)}
                  />
                  <ThemedText type="caption" themeColor="textMuted">
                    This recording is hosted on another site, so it can&apos;t be downloaded for offline viewing.
                  </ThemedText>
                </>
              )}
            </View>
          ) : (
            <Card>
              <ThemedText type="small" themeColor="textSecondary">
                This session has ended. A recording will appear here if the host shares one.
              </ThemedText>
            </Card>
          ))}

        {/* Host controls (LIVE-001/002, LIVE-006) */}
        {isHost && (
          <Card style={styles.section}>
            <ThemedText type="smallBold">Host controls</ThemedText>
            {data.status === 'upcoming' && (
              <Button title="Start session" icon={Play} loading={update.isPending} onPress={() => update.mutate({ status: 'live' })} />
            )}
            {data.status === 'live' && (
              <>
                <Button title="Open my stream" variant="outline" icon={ExternalLink} onPress={() => WebBrowser.openBrowserAsync(data.stream_url)} />
                <Button
                  title="End session"
                  variant="danger"
                  icon={Square}
                  loading={update.isPending}
                  onPress={() =>
                    Alert.alert('End this session?', 'Viewers will no longer see it as live.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'End session', style: 'destructive', onPress: () => update.mutate({ status: 'ended' }) },
                    ])
                  }
                />
              </>
            )}
            {data.status === 'ended' && (
              <>
                <ThemedText type="caption" themeColor="textSecondary">
                  {recording ? 'Replace the recording:' : 'Share the recording so learners can watch it later:'}
                </ThemedText>
                <Button title="Upload a video (MP4/MOV, 50 MB max)" variant="outline" icon={Upload} onPress={uploadVideo} />
                <TextField
                  label="…or paste a recording link"
                  value={recordingLink}
                  onChangeText={setRecordingLink}
                  autoCapitalize="none"
                  keyboardType="url"
                  placeholder="https://"
                />
                <Button
                  title="Save recording link"
                  variant="outline"
                  icon={Link2}
                  disabled={!linkValid}
                  loading={update.isPending}
                  onPress={() => update.mutate({ recording_url: recordingLink.trim() })}
                />
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  section: {
    gap: Spacing.three - 4,
  },
});
