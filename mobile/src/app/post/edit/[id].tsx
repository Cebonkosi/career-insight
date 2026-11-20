import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { PostComposer } from '@/components/posts/post-composer';
import { QueryState } from '@/components/query-state';
import { ScreenIntro } from '@/components/tab-screen';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { queryKeys } from '@/lib/query-keys';
import { getPost, updatePost } from '@/services/posts';

/** Edit your own post (UAT POST-006). The database rejects edits to anyone else's. */
export default function EditPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const post = useQuery({ queryKey: queryKeys.post(id), queryFn: () => getPost(id) });
  const data = post.data;

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back right={null} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          keyboardShouldPersistTaps="handled">
          <ScreenIntro title="Edit post." />
          {!data ? (
            <QueryState isPending={post.isPending} error={post.error} onRetry={() => post.refetch()} label="this post" />
          ) : data.author_id !== session?.user.id ? (
            <EmptyState title="You can only edit your own posts" />
          ) : (
            <PostComposer
              initial={data}
              submitLabel="Save changes"
              onSubmit={async (input) => {
                await updatePost(id, input);
                queryClient.invalidateQueries({ queryKey: ['posts'] });
                router.back();
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
});
