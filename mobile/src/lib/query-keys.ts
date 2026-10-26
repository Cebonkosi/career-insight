import type { OpportunityFilters } from '@/services/opportunities';

export const queryKeys = {
  opportunities: (filters: OpportunityFilters) => ['opportunities', filters] as const,
  opportunity: (id: string) => ['opportunity', id] as const,
  saved: (userId: string, opportunityId: string) => ['saved', userId, opportunityId] as const,
  applications: (userId: string) => ['applications', userId] as const,
};
