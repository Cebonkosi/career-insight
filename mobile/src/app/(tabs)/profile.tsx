import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/chip';
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
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { session, profile, signOut } = useAuth();
  if (!profile) return null;

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

  function confirmSignOut() {
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <TabScreen title="Profile">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <View style={[styles.avatar, { backgroundColor: theme.primarySoft }]}>
            <ThemedText style={[styles.initial, { color: theme.primary }]}>
              {profile.display_name.slice(0, 1).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.name}>
            {profile.display_name}
          </ThemedText>
          <View style={styles.badges}>
            <Badge label={roleLabel} />
            {profile.role === 'contributor' && (
              <Badge label={profile.verified ? 'Verified' : 'Awaiting verification'} tone="muted" />
            )}
          </View>
        </View>

        <View style={[styles.card, styles.details, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <DetailRow label="Email" value={session?.user.email} />
          <DetailRow label="Grade" value={profile.grade ? `Grade ${profile.grade}` : null} />
          <DetailRow label="School" value={profile.school} />
          <DetailRow label="Organisation" value={profile.organization_name} />
          <DetailRow
            label="Organisation type"
            value={CONTRIBUTOR_TYPES.find((t) => t.value === profile.contributor_type)?.label}
          />
          <DetailRow label="Province" value={profile.province} />
        </View>

        <Button title="Sign out" variant="outline" onPress={confirmSignOut} />
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: 18,
    borderWidth: 1,
  },
  details: {
    alignItems: 'stretch',
    gap: Spacing.three,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: 700,
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
});
