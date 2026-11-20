import { router } from 'expo-router';
import { CalendarDays, Download, FileText, FolderOpen, Trash2 } from 'lucide-react-native';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { Radius, Spacing } from '@/constants/theme';
import { useFormDownload } from '@/hooks/use-form-download';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, formatDate } from '@/lib/format';
import type { SavedDownload } from '@/types/models';

/**
 * One Saved Downloads entry (UAT DL-005/006/007): open the file saved on this
 * device, or download it again. Deliberately no draft, submit or notes
 * controls — this is a list of resources, not an application tracker.
 */
export function SavedDownloadRow({ item, onRemove }: { item: SavedDownload; onRemove: () => void }) {
  const theme = useTheme();
  const opportunityId = item.opportunity_id ?? item.id;
  const { saved, downloading, download, open } = useFormDownload(opportunityId);
  const deadline = deadlineLabel(item.deadline);
  const title = item.opportunity_title ?? 'Application form';

  function confirmRemove() {
    Alert.alert('Remove from Saved Downloads?', 'The form on this device stays where it is. You can download it again any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onRemove },
    ]);
  }

  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Pressable
        accessibilityRole="link"
        disabled={!item.opportunity_id}
        onPress={() => item.opportunity_id && router.push({ pathname: '/opportunity/[id]', params: { id: item.opportunity_id } })}
        style={styles.titleRow}>
        <FileText color={theme.primary} size={24} strokeWidth={1.5} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {[item.organization_name, `Downloaded ${formatDate(item.last_downloaded_at ?? item.download_date)}`]
              .filter(Boolean)
              .join(' · ')}
            {item.times_downloaded > 1 ? ` · ${item.times_downloaded} times` : ''}
          </ThemedText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Remove from Saved Downloads" hitSlop={10} onPress={confirmRemove}>
          <Trash2 color={theme.textMuted} size={18} />
        </Pressable>
      </Pressable>

      <View style={styles.tags}>
        <Tag label={opportunityTypeLabel(item.opportunity_type)} />
        {saved && <Tag label="On this device" tone="soft" />}
      </View>

      {deadline && (
        <View style={styles.inline}>
          <CalendarDays color={deadline.closed ? theme.textMuted : theme.warning} size={15} />
          <ThemedText type="caption" themeColor={deadline.closed ? 'textMuted' : 'warning'}>
            {deadline.text}
          </ThemedText>
        </View>
      )}

      <View style={styles.actions}>
        {saved && <Button title="Open form" icon={FolderOpen} style={styles.flex} onPress={() => open(title)} />}
        <Button
          title={saved ? 'Download again' : 'Download'}
          variant="outline"
          icon={Download}
          style={styles.flex}
          loading={downloading}
          disabled={!item.form_url || !item.opportunity_id}
          onPress={() => download({ id: opportunityId, title, form_url: item.form_url })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
    padding: Spacing.three + 2,
    borderRadius: Radius.card,
    borderWidth: 1,
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
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
