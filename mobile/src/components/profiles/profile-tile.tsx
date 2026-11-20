import { router } from 'expo-router';
import { BadgeCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ThemedText } from '@/components/themed-text';
import { contributorTypeLabel } from '@/constants/options';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProfileCard } from '@/types/models';

function openProfile(userId: string) {
  router.push({ pathname: '/profile/[userId]', params: { userId } });
}

export function profileName(card: ProfileCard) {
  return card.organization_name || card.display_name;
}

/** Compact card for the horizontal "People to follow" row on Home (NAV-007). */
export function ProfileTile({ card }: { card: ProfileCard }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => openProfile(card.user_id)}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <GradientAvatar name={profileName(card)} imageUrl={card.organization_logo ?? card.avatar_url} size={52} />
      <View style={styles.nameRow}>
        <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
          {profileName(card)}
        </ThemedText>
        {card.verified && <BadgeCheck color={theme.primary} size={14} />}
      </View>
      <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
        {contributorTypeLabel(card.contributor_type)}
      </ThemedText>
    </Pressable>
  );
}

/** Full-width row for search results. */
export function ProfileRow({ card }: { card: ProfileCard }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => openProfile(card.user_id)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <GradientAvatar name={profileName(card)} imageUrl={card.organization_logo ?? card.avatar_url} size={44} />
      <View style={styles.flex}>
        <View style={styles.nameRow}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.shrink}>
            {profileName(card)}
          </ThemedText>
          {card.verified && <BadgeCheck color={theme.primary} size={14} />}
        </View>
        <ThemedText type="caption" themeColor="textMuted" numberOfLines={1}>
          {[contributorTypeLabel(card.contributor_type), card.province, `${card.followers_count} followers`]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 150,
    alignItems: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
  },
  flex: {
    flex: 1,
  },
  shrink: {
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
});
