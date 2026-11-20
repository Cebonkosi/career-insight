import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Tag } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { BrandGradient, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel } from '@/lib/format';
import type { Opportunity } from '@/types/models';

/** Card for horizontal opportunity rows, led by the cover image (UAT OPP-002, OPP-010, NAV-007). */
export function OpportunityCoverCard({ opportunity }: { opportunity: Opportunity }) {
  const theme = useTheme();
  const deadline = deadlineLabel(opportunity.deadline);

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${opportunity.title}, ${opportunityTypeLabel(opportunity.type)}`}
      onPress={() => router.push({ pathname: '/opportunity/[id]', params: { id: opportunity.id } })}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      {opportunity.image_url ? (
        <Image source={opportunity.image_url} style={styles.cover} contentFit="cover" transition={150} />
      ) : (
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cover} />
      )}
      <View style={styles.body}>
        <Tag label={opportunityTypeLabel(opportunity.type)} />
        <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
          {opportunity.title}
        </ThemedText>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {opportunity.contributor_name ?? 'Career Insight'}
        </ThemedText>
        {deadline && (
          <View style={styles.deadline}>
            <CalendarDays color={deadline.closed ? theme.textMuted : theme.warning} size={14} />
            <ThemedText type="caption" themeColor={deadline.closed ? 'textMuted' : 'warning'} numberOfLines={1}>
              {deadline.text}
            </ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 248,
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.9,
  },
  cover: {
    width: '100%',
    height: 120,
  },
  body: {
    gap: Spacing.one + 2,
    padding: Spacing.three,
  },
  title: {
    fontSize: 15,
    lineHeight: 20,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + 2,
  },
});
