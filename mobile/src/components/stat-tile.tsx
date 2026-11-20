import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

/** Number card from the Contributor studio mockup ("Followers 1,284"). */
export function StatTile({ label, value, note }: { label: string; value: number | null | undefined; note?: string }) {
  return (
    <Card style={styles.tile}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="display" themeColor="primary" style={styles.value}>
        {value == null ? '—' : value.toLocaleString('en-US')}
      </ThemedText>
      {note && (
        <ThemedText type="caption" themeColor="textMuted">
          {note}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 140,
    gap: Spacing.one,
  },
  value: {
    fontSize: 30,
    lineHeight: 36,
  },
});
