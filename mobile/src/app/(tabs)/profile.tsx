import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { LogOut, Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { ApprovalBanner } from '@/components/approval-banner';
import { EmptyState } from '@/components/empty-state';
import { SavedDownloadRow } from '@/components/opportunities/saved-download-row';
import { AuthorPosts } from '@/components/posts/author-posts';
import { ProfileHeader } from '@/components/profiles/profile-header';
import { QueryState } from '@/components/query-state';
import { TabScreen } from '@/components/tab-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useRole } from '@/hooks/use-role';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listSavedDownloads, removeSavedDownload } from '@/services/opportunities';

type ProfileTab = 'posts' | 'downloads';

function SavedDownloads({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.savedDownloads(userId), queryFn: () => listSavedDownloads(userId) });
  const remove = useMutation({
    mutationFn: removeSavedDownload,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedDownloads(userId) }),
    onError: (err) => Alert.alert('Could not remove it', errorMessage(err, 'Please try again.')),
  });

  if (!query.data?.length) {
    return query.isPending || query.isError ? (
      <QueryState isPending={query.isPending} error={query.error} onRetry={() => query.refetch()} label="Saved Downloads" />
    ) : (
      <EmptyState
        title="No downloads yet"
        description="Open an opportunity and tap Download application form. It will appear here so you can find it again."
      />
    );
  }

  return (
    <View style={styles.list}>
      <ThemedText type="caption" themeColor="textSecondary">
        Forms you&apos;ve downloaded. Complete them and submit them through each provider&apos;s own channel —
        Career Insight doesn&apos;t submit applications for you.
      </ThemedText>
      {query.data.map((item) => (
        <SavedDownloadRow key={item.id} item={item} onRemove={() => remove.mutate(item.id)} />
      ))}
    </View>
  );
}

/** Profile tab: identity, own post history, and (learners only) Saved Downloads (UAT DL-005, POST-009). */
export default function ProfileScreen() {
  const { session, profile, signOut } = useAuth();
  const { hasSavedDownloads } = useRole();
  const [tab, setTab] = useState<ProfileTab>(hasSavedDownloads ? 'downloads' : 'posts');
  if (!profile || !session) return null;

  function confirmSignOut() {
    Alert.alert('Sign out?', 'Forms and recordings saved on this device stay available offline.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  }

  const tabs: { value: ProfileTab; label: string }[] = hasSavedDownloads
    ? [
        { value: 'downloads', label: 'Saved Downloads' },
        { value: 'posts', label: 'My posts' },
      ]
    : [{ value: 'posts', label: 'My posts' }];

  return (
    <TabScreen>
      <ScrollView contentContainerStyle={styles.content}>
        <ProfileHeader
          profile={profile}
          actions={
            <View style={styles.actions}>
              <Button title="Edit profile" variant="outline" icon={Pencil} style={styles.flex} onPress={() => router.push('/profile/edit')} />
              <Button title="Sign out" variant="ghost" icon={LogOut} onPress={confirmSignOut} />
            </View>
          }
        />
        <ApprovalBanner />

        {tabs.length > 1 && <Segmented options={tabs} value={tab} onChange={setTab} />}

        {tab === 'downloads' && hasSavedDownloads ? (
          <SavedDownloads userId={session.user.id} />
        ) : (
          <AuthorPosts authorId={session.user.id} emptyText="Posts you share appear here." />
        )}
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  list: {
    gap: Spacing.three,
  },
});
