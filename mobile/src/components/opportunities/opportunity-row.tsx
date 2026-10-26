import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel } from '@/lib/format';
import type { Opportunity } from '@/types/models';

export function OpportunityRow({ opportunity }: { opportunity: Opportunity }) {
  const theme = useTheme();
  const deadline = deadlineLabel(opportunity.deadline);

  return (
    <Link href={{ pathname: '/opportunity/[id]', params: { id: opportunity.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          pressed && styles.pressed,
        ]}>
        <View style={[styles.logo, { backgroundColor: theme.primarySoft }]}>
          {opportunity.contributor_logo ? (
            <Image source={opportunity.contributor_logo} style={styles.logoImage} contentFit="cover" />
          ) : (
            <ThemedText type="smallBold" themeColor="primary">
              {(opportunity.contributor_name ?? opportunity.title).slice(0, 1).toUpperCase()}
            </ThemedText>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.badges}>
            <Badge label={opportunityTypeLabel(opportunity.type)} />
            {opportunity.featured && <Badge label="Featured" tone="muted" />}
          </View>
          <ThemedText type="smallBold" numberOfLines={2} style={styles.title}>
            {opportunity.title}
          </ThemedText>
          {opportunity.contributor_name && (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {opportunity.contributor_name}
            </ThemedText>
          )}
          {deadline && (
            <ThemedText
              type="small"
              themeColor={deadline.urgent ? 'danger' : 'textSecondary'}
              style={styles.deadline}>
              {deadline.text}
            </ThemedText>
          )}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.85,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
  },
  deadline: {
    fontSize: 13,
  },
});
