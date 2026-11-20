import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listFollowingIds, setFollowing } from '@/services/profile';

export function useFollowing() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const queryClient = useQueryClient();
  const key = queryKeys.followingIds(userId);

  const { data: followingIds = [] } = useQuery({ queryKey: key, queryFn: () => listFollowingIds(userId) });

  const toggle = useMutation({
    mutationFn: ({ targetId, follow }: { targetId: string; follow: boolean }) =>
      setFollowing(userId, targetId, follow),
    onMutate: ({ targetId, follow }) => {
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        follow ? [...ids, targetId] : ids.filter((id) => id !== targetId),
      );
    },
    onError: (err) => Alert.alert('Could not update follow', errorMessage(err, 'Please try again.')),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: ['profile-card'] });
      queryClient.invalidateQueries({ queryKey: ['posts', 'feed'] });
    },
  });

  return {
    followingIds,
    isFollowing: (targetId: string) => followingIds.includes(targetId),
    toggleFollow: (targetId: string) =>
      targetId !== userId && toggle.mutate({ targetId, follow: !followingIds.includes(targetId) }),
  };
}
