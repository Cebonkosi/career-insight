import { BadgeCheck, LogOut } from 'lucide-react-native';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { CONTRIBUTOR_TYPES } from '@/constants/options';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold" style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, profile, signOut } = useAuth();
  if (!profile) return null;

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
  const contributorType = CONTRIBUTOR_TYPES.find((t) => t.value === profile.contributor_type)?.label;

  function confirmSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenIntro title="Your profile." subtitle="What we use to match opportunities to you." />

        <Card style={styles.identity}>
          <GradientAvatar name={profile.display_name} imageUrl={profile.avatar_url} size={56} />
          <View style={styles.flex}>
            <View style={styles.nameRow}>
              <ThemedText type="cardTitle">{profile.display_name}</ThemedText>
              {profile.verified && <BadgeCheck color={theme.primary} size={18} />}
            </View>
            <ThemedText type="caption" themeColor="textSecondary">
              {session?.user.email}
            </ThemedText>
            <View style={styles.tags}>
              <Tag label={roleLabel} />
              {profile.role === 'contributor' && (
                <Tag label={profile.verified ? 'Verified' : 'Awaiting verification'} tone="outline" />
              )}
            </View>
          </View>
        </Card>

        <Card style={styles.details}>
          <DetailRow label="Grade" value={profile.grade ? `Grade ${profile.grade}` : null} />
          <DetailRow label="School" value={profile.school} />
          <DetailRow label="Organisation" value={profile.organization_name} />
          <DetailRow label="Organisation type" value={contributorType} />
          <DetailRow label="Province" value={profile.province} />
          <DetailRow label="City" value={profile.city} />
        </Card>

        <Button title="Sign out" variant="outline" icon={LogOut} onPress={confirmSignOut} />
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  flex: {
    flex: 1,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tags: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  details: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
