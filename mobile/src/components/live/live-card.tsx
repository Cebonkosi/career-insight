import { router } from 'expo-router';
import { CalendarClock, Download, Radio, Users, Video } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ThemedText } from '@/components/themed-text';
import { Tag } from '@/components/ui/chip';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';
import type { LiveStream } from '@/types/models';

export function streamStatusTag(stream: LiveStream) {
  if (stream.status === 'live') return <Tag label="LIVE NOW" tone="warning" />;
  if (stream.status === 'upcoming') return <Tag label="Upcoming" tone="soft" />;
  return <Tag label={stream.recording_url ? 'Recording' : 'Ended'} tone="outline" />;
}

/** Session card from the Live session mockup. */
export function LiveCard({ stream, downloaded }: { stream: LiveStream; downloaded?: boolean }) {
  const theme = useTheme();
  const when = stream.status === 'upcoming' ? stream.scheduled_date : stream.started_at ?? stream.scheduled_date;

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => router.push({ pathname: '/live/[id]', params: { id: stream.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.topRow}>
        {streamStatusTag(stream)}
        {downloaded && (
          <View style={styles.inline}>
            <Download color={theme.accent} size={14} />
            <ThemedText type="caption" themeColor="accent">
              Saved offline
            </ThemedText>
          </View>
        )}
      </View>

      <ThemedText type="cardTitle" numberOfLines={2}>
        {stream.title}
      </ThemedText>

      <View style={styles.inline}>
        <GradientAvatar name={stream.host_name ?? 'Host'} imageUrl={stream.host_avatar} size={24} />
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
          With {stream.host_name ?? 'a Career Insight host'}
        </ThemedText>
      </View>

      <View style={[styles.meta, { borderColor: theme.border }]}>
        {when && (
          <View style={styles.inline}>
            <CalendarClock color={theme.textSecondary} size={15} />
            <ThemedText type="caption" themeColor="textSecondary">
              {formatDateTime(when)}
            </ThemedText>
          </View>
        )}
        <View style={styles.inline}>
          {stream.status === 'ended' ? (
            <Video color={theme.textSecondary} size={15} />
          ) : stream.status === 'live' ? (
            <Radio color={theme.warning} size={15} />
          ) : (
            <Users color={theme.textSecondary} size={15} />
          )}
          <ThemedText type="caption" themeColor="textSecondary">
            {stream.viewers_count} viewer{stream.viewers_count === 1 ? '' : 's'}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    paddingTop: Spacing.three - 4,
    borderTopWidth: 1,
  },
});
