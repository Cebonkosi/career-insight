import { Hourglass } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';

/** Shown to contributors and tutors until an admin approves their account. */
export function ApprovalBanner({ feature }: { feature?: string }) {
  const theme = useTheme();
  const { awaitingApproval, isTutor } = useRole();
  if (!awaitingApproval) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.warningSoft }]}>
      <Hourglass color={theme.warning} size={18} />
      <View style={styles.flex}>
        <ThemedText type="smallBold" themeColor="warning">
          Your {isTutor ? 'tutor' : 'contributor'} account is awaiting approval
        </ThemedText>
        <ThemedText type="caption" themeColor="warning">
          {feature
            ? `${feature} unlocks once the Career Insight team has verified your account.`
            : 'You can post and explore now. Categories, live sessions and analytics unlock once the Career Insight team verifies you.'}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: Spacing.three - 4,
    padding: Spacing.three,
    borderRadius: Radius.control,
  },
  flex: {
    flex: 1,
    gap: Spacing.half,
  },
});
