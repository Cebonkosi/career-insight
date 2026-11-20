import { useQuery } from '@tanstack/react-query';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { Globe, UserCheck, UserPlus } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { AuthorPosts } from '@/components/posts/author-posts';
import { ProfileHeader } from '@/components/profiles/profile-header';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFollowing } from '@/hooks/use-following';
import { queryKeys } from '@/lib/query-keys';
import { getProfileCard } from '@/services/profile';

/** Someone else's public profile: no contact details, just their card and posts (NFR-001, NAV-005). */
export default function PublicProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { isFollowing, toggleFollow } = useFollowing();
  const card = useQuery({ queryKey: queryKeys.profileCard(userId), queryFn: () => getProfileCard(userId) });

  if (userId === session?.user.id) return <Redirect href="/profile" />;

  const data = card.data;
  const following = isFollowing(userId);
  const website = data?.website && /^https?:\/\//.test(data.website) ? data.website : null;

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}>
        {!data ? (
          card.isPending || card.isError ? (
            <QueryState isPending={card.isPending} error={card.error} onRetry={() => card.refetch()} label="this profile" />
          ) : (
            <EmptyState title="Profile unavailable" />
          )
        ) : (
          <>
            <ProfileHeader
              profile={data}
              actions={
                <View style={styles.actions}>
                  <Button
                    title={following ? 'Following' : 'Follow'}
                    variant={following ? 'outline' : 'primary'}
                    icon={following ? UserCheck : UserPlus}
                    style={styles.flex}
                    onPress={() => toggleFollow(userId)}
                  />
                  {website && (
                    <Button title="Website" variant="ghost" icon={Globe} onPress={() => WebBrowser.openBrowserAsync(website)} />
                  )}
                </View>
              }
            />
            <ThemedText type="heading">Posts</ThemedText>
            <AuthorPosts authorId={userId} emptyText="Nothing shared yet." />
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
