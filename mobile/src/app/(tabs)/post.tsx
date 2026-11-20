import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { ApprovalBanner } from '@/components/approval-banner';
import { PostComposer } from '@/components/posts/post-composer';
import { ScreenIntro, TabScreen } from '@/components/tab-screen';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { createPost } from '@/services/posts';

/** Centre "Post" tab (UAT NAV-001, POST-001…005). */
export default function PostScreen() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return (
    <TabScreen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenIntro title="Share something useful." subtitle="Your post appears in the community feed and on your profile." />
          <ApprovalBanner />
          <PostComposer
            submitLabel="Publish post"
            onSubmit={async (input) => {
              const post = await createPost(session!.user.id, input);
              queryClient.invalidateQueries({ queryKey: ['posts'] });
              router.push({ pathname: '/post/[id]', params: { id: post.id } });
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
  },
});
