import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { RefreshCw } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Plays a recording from a remote URL or a downloaded local file (UAT LIVE-006/008/009). */
export function RecordingPlayer({ uri, offline }: { uri: string; offline: boolean }) {
  const theme = useTheme();
  const player = useVideoPlayer({ uri });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });

  return (
    <View style={styles.wrap}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true }}
        accessibilityLabel="Session recording"
      />
      {status === 'error' && (
        <View style={[styles.error, { backgroundColor: theme.warningSoft }]}>
          <ThemedText type="small" themeColor="warning">
            {offline
              ? 'This downloaded file could not be played. Delete it and download it again.'
              : `The recording couldn't load${error?.message ? ` (${error.message})` : ''}. Check your connection and retry.`}
          </ThemedText>
          {!offline && (
            <Button title="Retry" variant="outline" icon={RefreshCw} onPress={() => player.replaceAsync({ uri })} />
          )}
        </View>
      )}
      <ThemedText type="caption" themeColor="textMuted">
        {offline ? 'Playing the copy saved on this device — no internet needed.' : 'Streaming from Career Insight.'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.card,
    backgroundColor: '#000000',
  },
  error: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.control,
  },
});
