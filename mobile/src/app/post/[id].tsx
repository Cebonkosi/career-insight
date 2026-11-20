import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Flag, Pencil, Send, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { GradientAvatar } from '@/components/brand/gradient-avatar';
import { EmptyState } from '@/components/empty-state';
import { PostCard } from '@/components/posts/post-card';
import { QueryState } from '@/components/query-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { usePostLikes } from '@/hooks/use-post-likes';
import { useRole } from '@/hooks/use-role';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage, timeAgo } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { addComment, deletePost, getPost, listComments, removeComment, reportPost } from '@/services/posts';

const REPORT_REASONS = ['Harmful or inappropriate', 'Spam or a scam', 'Shares personal information', 'Misleading funding claim'];
const MAX_COMMENT_LENGTH = 500;

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { isAdmin } = useRole();
  const userId = session!.user.id;

  const [comment, setComment] = useState('');
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const post = useQuery({ queryKey: queryKeys.post(id), queryFn: () => getPost(id) });
  const comments = useQuery({ queryKey: queryKeys.comments(id), queryFn: () => listComments(id) });
  const { isLiked, toggleLike } = usePostLikes(post.data ? [post.data] : []);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.comments(id) });
  }

  const sendComment = useMutation({
    mutationFn: () => addComment(userId, id, comment.trim()),
    onSuccess: () => {
      setComment('');
      refresh();
    },
    onError: (err) => Alert.alert('Could not add your comment', errorMessage(err, 'Please try again.')),
  });

  const removeMine = useMutation({
    mutationFn: removeComment,
    onSuccess: refresh,
    onError: (err) => Alert.alert('Could not remove the comment', errorMessage(err, 'Please try again.')),
  });

  const remove = useMutation({
    mutationFn: () => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      router.back();
    },
    onError: (err) => Alert.alert('Could not delete the post', errorMessage(err, 'Please try again.')),
  });

  const report = useMutation({
    mutationFn: (why: string) => reportPost(id, why),
    onSuccess: () => {
      setReporting(false);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      Alert.alert('Thanks for reporting', 'The post is hidden while the Career Insight team reviews it.');
      router.back();
    },
    onError: (err) => Alert.alert('Could not send the report', errorMessage(err, 'Please try again.')),
  });

  function confirmDelete() {
    Alert.alert('Delete this post?', 'It will be removed from the feed and your profile. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove.mutate() },
    ]);
  }

  const data = post.data;
  const mine = data?.author_id === userId;
  const trimmed = comment.trim();

  return (
    <ThemedView style={styles.flex}>
      <AppHeader back right={<View />} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.five }]}
          keyboardShouldPersistTaps="handled">
          {!data ? (
            post.isPending || post.isError ? (
              <QueryState isPending={post.isPending} error={post.error} onRetry={() => post.refetch()} label="this post" />
            ) : (
              <EmptyState title="Post unavailable" description="It may have been deleted or is under review." />
            )
          ) : (
            <>
              <PostCard post={data} liked={isLiked(data.id)} onToggleLike={() => toggleLike(data.id)} standalone />

              {data.status === 'flagged' && mine && (
                <ThemedText type="caption" themeColor="warning">
                  This post was reported and is hidden from others while the Career Insight team reviews it.
                </ThemedText>
              )}

              <View style={styles.actions}>
                {mine ? (
                  <>
                    <Button
                      title="Edit"
                      variant="outline"
                      icon={Pencil}
                      style={styles.flex}
                      onPress={() => router.push({ pathname: '/post/edit/[id]', params: { id: data.id } })}
                    />
                    <Button
                      title="Delete"
                      variant="outline"
                      icon={Trash2}
                      style={styles.flex}
                      loading={remove.isPending}
                      onPress={confirmDelete}
                    />
                  </>
                ) : (
                  !isAdmin && (
                    <Button
                      title={reporting ? 'Cancel report' : 'Report post'}
                      variant="ghost"
                      icon={Flag}
                      onPress={() => setReporting((v) => !v)}
                    />
                  )
                )}
              </View>

              {reporting && (
                <Card style={styles.reportCard}>
                  <ThemedText type="smallBold">Why are you reporting this post?</ThemedText>
                  <View style={styles.chips}>
                    {REPORT_REASONS.map((r) => (
                      <Chip key={r} label={r} outlined selected={reason === r} onPress={() => setReason(r)} />
                    ))}
                  </View>
                  <Button
                    title="Send report"
                    variant="danger"
                    disabled={!reason}
                    loading={report.isPending}
                    onPress={() => reason && report.mutate(reason)}
                  />
                </Card>
              )}

              <ThemedText type="heading">Comments</ThemedText>

              {comments.data?.map((c) => (
                <View key={c.id} style={styles.comment}>
                  <GradientAvatar name={c.author_name ?? 'Member'} imageUrl={c.author_avatar} size={32} />
                  <View style={[styles.bubble, { backgroundColor: theme.backgroundSelected }]}>
                    <ThemedText type="smallBold">{c.author_name ?? 'Member'}</ThemedText>
                    <ThemedText type="small">{c.content}</ThemedText>
                    <View style={styles.commentMeta}>
                      <ThemedText type="caption" themeColor="textMuted">
                        {timeAgo(c.created_at)}
                      </ThemedText>
                      {(c.author_id === userId || isAdmin) && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove comment"
                          hitSlop={8}
                          onPress={() => removeMine.mutate(c.id)}>
                          <ThemedText type="caption" themeColor="danger">
                            Remove
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>
              ))}
              {comments.data?.length === 0 && (
                <ThemedText type="small" themeColor="textSecondary">
                  No comments yet. Start the conversation.
                </ThemedText>
              )}
              {comments.isError && (
                <QueryState error={comments.error} onRetry={() => comments.refetch()} label="comments" />
              )}

              <View style={[styles.composer, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                <TextInput
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Add a thoughtful comment…"
                  placeholderTextColor={theme.textMuted}
                  maxLength={MAX_COMMENT_LENGTH}
                  multiline
                  accessibilityLabel="Comment"
                  style={[styles.commentInput, { color: theme.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Send comment"
                  disabled={!trimmed || sendComment.isPending}
                  onPress={() => sendComment.mutate()}
                  hitSlop={8}
                  style={[styles.send, { backgroundColor: trimmed ? theme.primary : theme.backgroundSelected }]}>
                  <Send color={trimmed ? theme.onPrimary : theme.textMuted} size={18} />
                </Pressable>
              </View>
            </>
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
    gap: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  reportCard: {
    gap: Spacing.three - 4,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  comment: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bubble: {
    flex: 1,
    gap: Spacing.half,
    padding: Spacing.three - 4,
    borderRadius: Radius.control,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.control,
    padding: Spacing.two,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: Spacing.two,
    fontFamily: Fonts.regular,
    fontSize: 15,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
