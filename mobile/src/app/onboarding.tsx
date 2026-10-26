import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AuthScreen } from '@/components/auth/auth-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { TextField } from '@/components/ui/text-field';
import { CONTRIBUTOR_TYPES, GRADES, PROVINCES, SIGN_UP_ROLES } from '@/constants/options';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/format';
import { createProfile, type NewProfile } from '@/services/profile';
import type { ContributorType } from '@/types/models';

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

export default function OnboardingScreen() {
  const theme = useTheme();
  const { session, refreshProfile, signOut } = useAuth();
  const [role, setRole] = useState<NewProfile['role']>('student');
  const [displayName, setDisplayName] = useState('');
  const [grade, setGrade] = useState<number | null>(null);
  const [school, setSchool] = useState('');
  const [province, setProvince] = useState<string | null>(null);
  const [contributorType, setContributorType] = useState<ContributorType | null>(null);
  const [organization, setOrganization] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isStudent = role === 'student';
  const isContributor = role === 'contributor';
  const canSubmit =
    displayName.trim().length > 0 &&
    (!isStudent || grade !== null) &&
    (!isContributor || (contributorType !== null && organization.trim().length > 0));

  async function handleFinish() {
    if (!session) return;
    setSubmitting(true);
    try {
      await createProfile({
        user_id: session.user.id,
        role,
        display_name: displayName.trim(),
        province,
        grade: isStudent ? grade : null,
        school: isStudent ? school.trim() || null : null,
        contributor_type: isContributor ? contributorType : null,
        organization_name: isContributor ? organization.trim() : null,
      });
      // Once the profile exists the root layout's guard swaps to the tabs.
      await refreshProfile();
    } catch (error) {
      Alert.alert('Could not save your profile', errorMessage(error, 'Please try again.'));
      setSubmitting(false);
    }
  }

  return (
    <AuthScreen title="Tell us about you" subtitle="We use this to show opportunities that fit you.">
      <View style={styles.group}>
        <ThemedText type="smallBold">I am a…</ThemedText>
        {SIGN_UP_ROLES.map((option) => {
          const selected = option.value === role;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setRole(option.value)}
              style={[
                styles.roleCard,
                {
                  backgroundColor: selected ? theme.primarySoft : theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                },
              ]}>
              <ThemedText type="smallBold">{option.label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {option.hint}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <TextField
        label={isContributor ? 'Your name' : 'Display name'}
        value={displayName}
        onChangeText={setDisplayName}
        autoComplete="name"
        textContentType="name"
      />

      {isStudent && (
        <>
          <ChipGroup label="Grade">
            {GRADES.map((g) => (
              <Chip key={g} label={`Grade ${g}`} selected={grade === g} onPress={() => setGrade(g)} />
            ))}
          </ChipGroup>
          <TextField label="School (optional)" value={school} onChangeText={setSchool} />
        </>
      )}

      {isContributor && (
        <>
          <ChipGroup label="Organisation type">
            {CONTRIBUTOR_TYPES.map((t) => (
              <Chip
                key={t.value}
                label={t.label}
                selected={contributorType === t.value}
                onPress={() => setContributorType(t.value)}
              />
            ))}
          </ChipGroup>
          <TextField label="Organisation name" value={organization} onChangeText={setOrganization} />
        </>
      )}

      <ChipGroup label="Province (optional)">
        {PROVINCES.map((p) => (
          <Chip
            key={p}
            label={p}
            selected={province === p}
            onPress={() => setProvince(province === p ? null : p)}
          />
        ))}
      </ChipGroup>

      <Button title="Get started" onPress={handleFinish} loading={submitting} disabled={!canSubmit} />
      <Button title="Sign out" variant="ghost" onPress={signOut} />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  roleCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: Spacing.three,
  },
});
