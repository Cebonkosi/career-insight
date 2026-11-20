import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listLikedPostIds, setPostLiked } from '@/services/posts';
import type { Post } from '@/types/models';

/** Which of these posts the user has liked, plus an optimistic like toggle. */
export function usePostLikes(posts: Post[]) {
  const { session } = useAuth();
  const userId = session!.user.id;
  const queryClient = useQueryClient();
  const ids = posts.map((p) => p.id).sort();
  const key = queryKeys.likedPosts(userId, ids);

  const { data: liked = [] } = useQuery({
    queryKey: key,
    queryFn: () => listLikedPostIds(userId, ids),
    enabled: ids.length > 0,
  });

  const toggle = useMutation({
    mutationFn: ({ postId, like }: { postId: string; like: boolean }) => setPostLiked(userId, postId, like),
    onMutate: ({ postId, like }) => {
      queryClient.setQueryData<string[]>(key, (current = []) =>
        like ? [...current, postId] : current.filter((id) => id !== postId),
      );
    },
    onError: (err) => Alert.alert('Could not update like', errorMessage(err, 'Please try again.')),
    // Counts are maintained by the database; refetch posts to show the new total.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['posts'] }),
  });

  return {
    isLiked: (postId: string) => liked.includes(postId),
    toggleLike: (postId: string) => toggle.mutate({ postId, like: !liked.includes(postId) }),
  };
}
