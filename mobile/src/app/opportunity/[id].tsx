import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { deadlineLabel, errorMessage, formatDate } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import {
  getOpportunity,
  isOpportunitySaved,
  recordFormDownload,
  setOpportunitySaved,
} from '@/services/opportunities';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.fact}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small">{value}</ThemedText>
    </View>
  );
}

export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;

  const { data: opportunity, isPending, error } = useQuery({
    queryKey: queryKeys.opportunity(id),
    queryFn: () => getOpportunity(id),
  });

  const { data: isSaved = false } = useQuery({
    queryKey: queryKeys.saved(userId, id),
    queryFn: () => isOpportunitySaved(userId, id),
  });

  const download = useMutation({
    mutationFn: () => recordFormDownload(id),
    onSuccess: async (formUrl) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.opportunity(id) });
      await WebBrowser.openBrowserAsync(formUrl);
    },
    onError: (err) => Alert.alert('Could not download form', errorMessage(err, 'Please try again.')),
  });

  const toggleSaved = useMutation({
    mutationFn: () => setOpportunitySaved(userId, opportunity!, !isSaved),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.saved(userId, id) }),
    onError: (err) => Alert.alert('Could not update saved items', errorMessage(err, 'Please try again.')),
  });

  if (isPending) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (error || !opportunity) {
    return (
      <ThemedView style={styles.centered}>
        <EmptyState
          title="Opportunity unavailable"
          description={errorMessage(error, 'It may have closed or been removed.')}
        />
      </ThemedView>
    );
  }

  const deadline = deadlineLabel(opportunity.deadline);
  const location = opportunity.is_remote
    ? 'Remote'
    : [opportunity.location, opportunity.province].filter(Boolean).join(', ') || null;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: opportunityTypeLabel(opportunity.type) }} />
      <ScrollView contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
        {opportunity.image_url && (
          <Image source={opportunity.image_url} style={styles.hero} contentFit="cover" transition={200} />
        )}

        <View style={styles.header}>
          <View style={styles.badges}>
            <Badge label={opportunityTypeLabel(opportunity.type)} />
            {deadline && <Badge label={deadline.text} tone={deadline.urgent ? 'danger' : 'muted'} />}
          </View>
          <ThemedText style={styles.title}>{opportunity.title}</ThemedText>
          {opportunity.contributor_name && (
            <ThemedText themeColor="textSecondary">{opportunity.contributor_name}</ThemedText>
          )}
        </View>

        <View style={[styles.facts, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Fact label="Deadline" value={opportunity.deadline ? formatDate(opportunity.deadline) : null} />
          <Fact label="Location" value={location} />
          <Fact label="Value" value={opportunity.value} />
          <Fact
            label="Eligible grades"
            value={opportunity.eligibility_grades?.length ? opportunity.eligibility_grades.join(', ') : null}
          />
        </View>

        {opportunity.description && (
          <Section title="About">
            <ThemedText type="small" style={styles.body}>
              {opportunity.description}
            </ThemedText>
          </Section>
        )}

        {opportunity.requirements && (
          <Section title="Requirements">
            <ThemedText type="small" style={styles.body}>
              {opportunity.requirements}
            </ThemedText>
          </Section>
        )}

        <View style={styles.actions}>
          {opportunity.form_url && (
            <Button
              title="Download application form"
              onPress={() => download.mutate()}
              loading={download.isPending}
              disabled={deadline?.closed}
            />
          )}
          {opportunity.application_url && (
            <Button
              title="Apply on the organisation's site"
              variant="outline"
              onPress={() => WebBrowser.openBrowserAsync(opportunity.application_url!)}
              disabled={deadline?.closed}
            />
          )}
          <Button
            title={isSaved ? 'Saved ✓' : 'Save for later'}
            variant="ghost"
            onPress={() => toggleSaved.mutate()}
            loading={toggleSaved.isPending}
          />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 8,
    borderRadius: 18,
  },
  header: {
    gap: Spacing.two,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 700,
  },
  facts: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 18,
    borderWidth: 1,
  },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  section: {
    gap: Spacing.one,
  },
  sectionTitle: {
    fontSize: 17,
  },
  body: {
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.two,
  },
});
