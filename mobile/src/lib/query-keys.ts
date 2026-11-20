import type { OpportunityFilters } from '@/services/opportunities';

export const queryKeys = {
  opportunities: (filters: OpportunityFilters) => ['opportunities', filters] as const,
  latestOpportunities: ['opportunities', 'latest'] as const,
  opportunity: (id: string) => ['opportunity', id] as const,
  contributor: (userId: string) => ['contributor', userId] as const,
  savedIds: (userId: string) => ['saved-opportunity-ids', userId] as const,
  savedDownloads: (userId: string) => ['saved-downloads', userId] as const,

  profileCard: (userId: string) => ['profile-card', userId] as const,
  profileSearch: (search: string) => ['profile-search', search] as const,
  followingIds: (userId: string) => ['following-ids', userId] as const,

  feed: (scope: string) => ['posts', 'feed', scope] as const,
  authorPosts: (authorId: string) => ['posts', 'author', authorId] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  likedPosts: (userId: string, ids: string[]) => ['posts', 'liked', userId, ids] as const,
  comments: (postId: string) => ['comments', postId] as const,

  streams: ['live-streams'] as const,
  stream: (id: string) => ['live-streams', id] as const,

  notifications: (userId: string) => ['notifications', userId] as const,
  unreadCount: (userId: string) => ['notifications', userId, 'unread'] as const,

  analytics: (kind: 'contributor' | 'platform', days: number) => ['analytics', kind, days] as const,
};
