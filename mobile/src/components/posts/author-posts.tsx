import { useInfiniteQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { PostCard } from '@/components/posts/post-card';
import { QueryState } from '@/components/query-state';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { usePostLikes } from '@/hooks/use-post-likes';
import { queryKeys } from '@/lib/query-keys';
import { POSTS_PAGE_SIZE, listPosts } from '@/services/posts';

/** A person's post history, newest first, loaded a page at a time (UAT POST-009). */
export function AuthorPosts({ authorId, emptyText }: { authorId: string; emptyText: string }) {
  const { session } = useAuth();
  const posts = useInfiniteQuery({
    queryKey: queryKeys.authorPosts(authorId),
    queryFn: ({ pageParam }) => listPosts({ kind: 'author', authorId }, pageParam, session?.user.id),
    initialPageParam: 0,
    getNextPageParam: (last, _pages, lastParam) => (last.length === POSTS_PAGE_SIZE ? lastParam + 1 : undefined),
  });
  const items = posts.data?.pages.flat() ?? [];
  const { isLiked, toggleLike } = usePostLikes(items);

  if (!items.length) {
    return posts.isPending || posts.isError ? (
      <QueryState isPending={posts.isPending} error={posts.error} onRetry={() => posts.refetch()} label="posts" />
    ) : (
      <EmptyState title="No posts yet" description={emptyText} />
    );
  }

  return (
    <View style={styles.list}>
      {items.map((post) => (
        <PostCard key={post.id} post={post} liked={isLiked(post.id)} onToggleLike={() => toggleLike(post.id)} />
      ))}
      {posts.hasNextPage && (
        <Button
          title="Load more posts"
          variant="outline"
          loading={posts.isFetchingNextPage}
          onPress={() => posts.fetchNextPage()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.three,
  },
});
