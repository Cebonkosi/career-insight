import type { OpportunityFilters } from '@/services/opportunities';

export const queryKeys = {
  opportunities: (filters: OpportunityFilters) => ['opportunities', filters] as const,
  opportunity: (id: string) => ['opportunity', id] as const,
  contributor: (userId: string) => ['contributor', userId] as const,
  savedIds: (userId: string) => ['saved-opportunity-ids', userId] as const,
  applications: (userId: string) => ['applications', userId] as const,
};
