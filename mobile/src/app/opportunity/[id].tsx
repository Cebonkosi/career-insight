import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Check,
  Download,
  ExternalLink,
  FileText,
} from 'lucide-react-native';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { EmptyState } from '@/components/empty-state';
import { opportunityPlace } from '@/components/opportunities/opportunity-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tag } from '@/components/ui/chip';
import { opportunityTypeLabel } from '@/constants/options';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useSavedOpportunities } from '@/hooks/use-saved-opportunities';
import { useTheme } from '@/hooks/use-theme';
import {
  deadlineLabel,
  errorMessage,
  fileNameFromUrl,
  formatLongDate,
  gradeRange,
  requirementLines,
} from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { getContributorProfile, getOpportunity, recordFormDownload } from '@/services/opportunities';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="heading">{title}</ThemedText>
      {children}
    </View>
  );
}

/** "Opportunity detail" mockup. */
export default function OpportunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session!.user.id;
  const { isSaved, toggleSaved } = useSavedOpportunities();

  const { data: opportunity, isPending, error } = useQuery({
    queryKey: queryKeys.opportunity(id),
    queryFn: () => getOpportunity(id),
  });

  const contributorId = opportunity?.contributor_id;
  const { data: contributor } = useQuery({
    queryKey: queryKeys.contributor(contributorId ?? ''),
    queryFn: () => getContributorProfile(contributorId!),
    enabled: Boolean(contributorId),
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

  const saved = isSaved(id);
  const BookmarkIcon = saved ? BookmarkCheck : Bookmark;
  const header = (
    <AppHeader
      back
      right={
        opportunity && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved' : 'Save opportunity'}
            hitSlop={12}
            onPress={() => toggleSaved(opportunity)}>
            <BookmarkIcon color={theme.primary} size={24} strokeWidth={1.75} />
          </Pressable>
        )
      }
    />
  );

  if (isPending || error || !opportunity) {
    return (
      <ThemedView style={styles.flex}>
        {header}
        <View style={styles.centered}>
          {isPending ? (
            <ActivityIndicator color={theme.primary} />
          ) : (
            <EmptyState
              title="Opportunity unavailable"
              description={errorMessage(error, 'It may have closed or been removed.')}
            />
          )}
        </View>
      </ThemedView>
    );
  }

  const deadline = deadlineLabel(opportunity.deadline);
  const organisation = opportunity.contributor_name ?? contributor?.organization_name ?? 'Career Insight';
  const place = opportunityPlace(opportunity);
  const grades = gradeRange(opportunity.eligibility_grades);
  const criteria = [
    ...(grades ? [`Learners in ${grades}`] : []),
    ...requirementLines(opportunity.requirements),
  ];

  return (
    <ThemedView style={styles.flex}>
      {header}
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        <ThemedText type="display">{opportunity.title}</ThemedText>

        <View style={styles.orgRow}>
          <GradientAvatar name={organisation} imageUrl={opportunity.contributor_logo} size={50} />
          <View style={styles.flex}>
            <ThemedText type="defaultMedium">{organisation}</ThemedText>
            <ThemedText type="caption" themeColor={contributor?.verified ? 'primary' : 'textMuted'}>
              {contributor?.verified ? 'Verified contributor' : 'Contributor'}
            </ThemedText>
          </View>
          {contributor?.verified && <BadgeCheck color={theme.primary} size={22} />}
        </View>

        <View style={styles.tags}>
          <Tag label={opportunityTypeLabel(opportunity.type)} tone="soft" />
          {place && <Tag label={place} tone="soft" />}
          {deadline?.closed && <Tag label="Closed" tone="warning" />}
        </View>

        {opportunity.image_url && (
          <Image source={opportunity.image_url} style={styles.hero} contentFit="cover" transition={200} />
        )}

        {(opportunity.value || opportunity.deadline) && (
          <Card style={styles.valueCard}>
            <ThemedText type="eyebrow" themeColor="textMuted">
              Invest in your next chapter
            </ThemedText>
            {opportunity.value && (
              <ThemedText type="display" style={styles.value}>
                {opportunity.value}
              </ThemedText>
            )}
            {opportunity.deadline && (
              <View style={[styles.valueFooter, { borderColor: theme.border }]}>
                <ThemedText type="small" themeColor={deadline?.closed ? 'textMuted' : 'warning'}>
                  {deadline?.closed ? 'Applications closed' : 'Applications close'}{' '}
                  {formatLongDate(opportunity.deadline)}
                </ThemedText>
              </View>
            )}
          </Card>
        )}

        {opportunity.description && (
          <ThemedText type="default" themeColor="textSecondary">
            {opportunity.description}
          </ThemedText>
        )}

        {criteria.length > 0 && (
          <Section title="Who can apply?">
            <Card style={styles.list}>
              {criteria.map((line) => (
                <View key={line} style={styles.checkRow}>
                  <Check color={theme.text} size={18} strokeWidth={2.25} />
                  <ThemedText type="small" style={styles.flex}>
                    {line}
                  </ThemedText>
                </View>
              ))}
              <ThemedText type="caption" themeColor="textSecondary">
                Not eligible yet? Save this opportunity to plan ahead.
              </ThemedText>
            </Card>
          </Section>
        )}

        {(opportunity.form_url || opportunity.application_url) && (
          <Section title="Application forms">
            <Card style={styles.list}>
              {opportunity.form_url && (
                <>
                  <View style={styles.fileRow}>
                    <FileText color={theme.primary} size={26} strokeWidth={1.5} />
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {fileNameFromUrl(opportunity.form_url)}
                      </ThemedText>
                      <ThemedText type="caption" themeColor="textMuted">
                        {opportunity.downloads_count.toLocaleString('en-ZA')} downloads
                      </ThemedText>
                    </View>
                  </View>
                  <Button
                    title="Download application form"
                    variant="outline"
                    icon={Download}
                    onPress={() => download.mutate()}
                    loading={download.isPending}
                    disabled={deadline?.closed}
                  />
                </>
              )}
              {opportunity.application_url && (
                <Button
                  title="Apply on the provider's site"
                  variant={opportunity.form_url ? 'ghost' : 'outline'}
                  icon={ExternalLink}
                  onPress={() => WebBrowser.openBrowserAsync(opportunity.application_url!)}
                  disabled={deadline?.closed}
                />
              )}
              <ThemedText type="caption" themeColor="textSecondary">
                Supplied by the contributor and reviewed by the Career Insight admin team. Submit
                completed forms through the channel the provider lists.
              </ThemedText>
            </Card>
          </Section>
        )}

        <Card style={styles.list}>
          <ThemedText type="smallBold">Before you apply</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Check the provider&apos;s official instructions. Never pay an application fee to an unknown
            person or share your account password.
          </ThemedText>
        </Card>
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
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: -Spacing.two,
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.card,
  },
  valueCard: {
    gap: Spacing.two,
  },
  value: {
    fontSize: 30,
    lineHeight: 36,
  },
  valueFooter: {
    borderTopWidth: 1,
    paddingTop: Spacing.three - 4,
  },
  section: {
    gap: Spacing.three - 4,
  },
  list: {
    gap: Spacing.three - 4,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three - 4,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three - 4,
  },
});
