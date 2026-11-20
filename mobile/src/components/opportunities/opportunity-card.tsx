import { router } from 'expo-router';
import { Bookmark, BookmarkCheck, CalendarDays } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ThemedText } from '@/components/themed-text';
import { Tag } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, gradeRange } from '@/lib/format';
import type { Opportunity } from '@/types/models';

type OpportunityCardProps = {
  opportunity: Opportunity;
  saved: boolean;
  onToggleSaved: () => void;
};

export function opportunityPlace(opportunity: Opportunity) {
  if (opportunity.is_remote) return 'Remote';
  return opportunity.location ?? opportunity.province;
}

/** Card from the "Opportunities browse" mockup. */
export function OpportunityCard({ opportunity, saved, onToggleSaved }: OpportunityCardProps) {
  const theme = useTheme();
  const deadline = deadlineLabel(opportunity.deadline);
  const organisation = opportunity.contributor_name ?? 'Career Insight';
  const place = opportunityPlace(opportunity);
  const eligibility = [gradeRange(opportunity.eligibility_grades), place]
    .filter(Boolean)
    .join(' • ');
  const BookmarkIcon = saved ? BookmarkCheck : Bookmark;

  return (
    // router.push rather than <Link asChild>: on web, Link's slot drops the
    // Pressable's function style, which removes the card surface.
    <Pressable
      accessibilityRole="link"
      onPress={() =>
        router.push({
          pathname: '/opportunity/[id]',
          params: { id: opportunity.id },
        })
      }
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.orgRow}>
        <GradientAvatar name={organisation} imageUrl={opportunity.contributor_logo} size={38} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {organisation}
          </ThemedText>
          <ThemedText type="caption" themeColor="textMuted">
            {opportunity.featured ? 'Featured opportunity' : opportunityTypeLabel(opportunity.type)}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved' : 'Save opportunity'}
          hitSlop={12}
          onPress={onToggleSaved}>
          <BookmarkIcon color={theme.text} size={22} strokeWidth={1.75} />
        </Pressable>
      </View>

      <ThemedText type="cardTitle" numberOfLines={2}>
        {opportunity.title}
      </ThemedText>

      <View style={styles.tags}>
        <Tag label={opportunityTypeLabel(opportunity.type)} />
        {opportunity.value && <Tag label={opportunity.value} tone="outline" />}
      </View>

      {eligibility.length > 0 && (
        <ThemedText type="small" themeColor="textSecondary">
          {eligibility}
        </ThemedText>
      )}

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
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    marginBottom: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three - 4,
    marginTop: Spacing.one,
    borderTopWidth: 1,
  },
});
