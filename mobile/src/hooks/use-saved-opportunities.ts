import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { errorMessage } from '@/lib/format';
import { queryKeys } from '@/lib/query-keys';
import { listSavedOpportunityIds, setOpportunitySaved } from '@/services/opportunities';
import type { Opportunity } from '@/types/models';

/** The user's saved opportunity ids plus a toggle, shared by cards and the detail screen. */
export function useSavedOpportunities() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const queryClient = useQueryClient();
  const key = queryKeys.savedIds(userId);

  const { data: savedIds = [] } = useQuery({
    queryKey: key,
    queryFn: () => listSavedOpportunityIds(userId),
  });

  const toggle = useMutation({
    mutationFn: (opportunity: Pick<Opportunity, 'id' | 'title'>) =>
      setOpportunitySaved(userId, opportunity, !savedIds.includes(opportunity.id)),
    // Flip the bookmark immediately; roll back if the write fails.
    onMutate: async (opportunity) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) ?? [];
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        ids.includes(opportunity.id) ? ids.filter((id) => id !== opportunity.id) : [...ids, opportunity.id],
      );
      return { previous };
    },
    onError: (err, _opportunity, context) => {
      queryClient.setQueryData(key, context?.previous);
      Alert.alert('Could not update saved items', errorMessage(err, 'Please try again.'));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    savedIds,
    isSaved: (id: string) => savedIds.includes(id),
    toggleSaved: (opportunity: Pick<Opportunity, 'id' | 'title'>) => toggle.mutate(opportunity),
  };
}
