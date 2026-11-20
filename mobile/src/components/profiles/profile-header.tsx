import { BadgeCheck } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { contributorTypeLabel } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ProfileCard, UserProfile } from '@/types/models';

type ProfileLike = Pick<
  ProfileCard,
  'role' | 'display_name' | 'avatar_url' | 'bio' | 'province' | 'contributor_type' | 'organization_name' | 'verified' | 'followers_count' | 'following_count'
> &
  Partial<Pick<UserProfile, 'grade'>>;

export function roleTitle(p: Pick<ProfileLike, 'role' | 'contributor_type'>) {
  if (p.role === 'contributor') return p.contributor_type === 'tutor' ? 'Tutor' : contributorTypeLabel(p.contributor_type);
  return { student: 'Student', parent: 'Parent', admin: 'Career Insight team' }[p.role];
}

/** Identity card shared by your own profile and other people's. */
export function ProfileHeader({ profile, actions }: { profile: ProfileLike; actions?: ReactNode }) {
  const theme = useTheme();
  const name = profile.organization_name && profile.role === 'contributor' ? profile.organization_name : profile.display_name;
  const showsVerification = profile.role === 'contributor';

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <GradientAvatar name={name} imageUrl={profile.avatar_url} size={60} />
        <View style={styles.flex}>
          <View style={styles.nameRow}>
            <ThemedText type="cardTitle" style={styles.shrink}>
              {name}
            </ThemedText>
            {profile.verified && <BadgeCheck color={theme.primary} size={18} />}
          </View>
          <View style={styles.tags}>
            <Tag label={roleTitle(profile)} />
            {showsVerification && (
              <Tag label={profile.verified ? 'Verified' : 'Awaiting approval'} tone={profile.verified ? 'soft' : 'warning'} />
            )}
            {profile.grade ? <Tag label={`Grade ${profile.grade}`} tone="outline" /> : null}
          </View>
        </View>
      </View>

      {profile.bio ? <ThemedText type="small">{profile.bio}</ThemedText> : null}

      <View style={styles.counts}>
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="smallBold">{profile.followers_count}</ThemedText> followers
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="smallBold">{profile.following_count}</ThemedText> following
        </ThemedText>
        {profile.province ? (
          <ThemedText type="small" themeColor="textSecondary">
            {profile.province}
          </ThemedText>
        ) : null}
      </View>

      {actions}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three - 4,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  flex: {
    flex: 1,
    gap: Spacing.one + 2,
  },
  shrink: {
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  counts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
});
