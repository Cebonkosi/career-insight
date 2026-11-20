import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { ScreenIntro } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { createStream } from '@/services/live';

const DAY_OPTIONS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 2 days', days: 2 },
  { label: 'In a week', days: 7 },
];
const TIME_OPTIONS = ['09:00', '12:00', '15:00', '17:00', '18:00', '19:00'];

function isHttpUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Schedule a session (UAT LIVE-001/002). Hidden from learners, and refused by the database for them too. */
export default function NewLiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { canHostLive } = useRole();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [day, setDay] = useState(1);
  const [time, setTime] = useState('17:00');

  const urlValid = isHttpUrl(streamUrl);
  const canSubmit = title.trim().length >= 3 && urlValid;

  const create = useMutation({
    mutationFn: () => {
      const [h, m] = time.split(':').map(Number);
      const when = new Date();
      when.setDate(when.getDate() + day);
      when.setHours(h, m, 0, 0);
      return createStream(session!.user.id, {
        title: title.trim(),
        description: description.trim() || null,
        stream_url: streamUrl.trim(),
        scheduled_date: when.toISOString(),
        category: null,
      });
    },
    onSuccess: (stream) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.streams });
      router.replace({ pathname: '/live/[id]', params: { id: stream.id } });
    },
    onError: (err) => Alert.alert('Could not schedule the session', errorMessage(err, 'Please try again.')),
  });

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back right={<View />} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          keyboardShouldPersistTaps="handled">
          <ScreenIntro title="Schedule a session." subtitle="Learners are notified as soon as you publish it." />

          {!canHostLive ? (
            <EmptyState
              title="Hosting isn't available on your account"
              description="Live sessions are hosted by admins and approved contributors."
            />
          ) : (
            <>
              <TextField label="Title" value={title} onChangeText={setTitle} maxLength={120} placeholder="What does an engineer actually do?" />
              <TextField
                label="What will you cover? (optional)"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={1000}
                style={styles.multiline}
              />
              <TextField
                label="Stream link"
                value={streamUrl}
                onChangeText={setStreamUrl}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://youtube.com/live/… or a Zoom/Meet link"
              />
              {streamUrl.length > 0 && !urlValid && (
                <ThemedText type="caption" themeColor="danger">
                  Enter a full link starting with https://
                </ThemedText>
              )}

              <View style={styles.group}>
                <ThemedText type="smallBold">Day</ThemedText>
                <View style={styles.chips}>
                  {DAY_OPTIONS.map((d) => (
                    <Chip key={d.label} label={d.label} outlined selected={day === d.days} onPress={() => setDay(d.days)} />
                  ))}
                </View>
              </View>
              <View style={styles.group}>
                <ThemedText type="smallBold">Start time (SAST)</ThemedText>
                <View style={styles.chips}>
                  {TIME_OPTIONS.map((t) => (
                    <Chip key={t} label={t} outlined selected={time === t} onPress={() => setTime(t)} />
                  ))}
                </View>
              </View>

              <Button title="Publish session" onPress={() => create.mutate()} loading={create.isPending} disabled={!canSubmit} />
              <ThemedText type="caption" themeColor="textSecondary">
                Viewers join through your stream link. After the session, attach the recording so learners can
                watch it later or download it for offline viewing.
              </ThemedText>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  multiline: {
    minHeight: 90,
    paddingTop: Spacing.three - 4,
    textAlignVertical: 'top',
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});
