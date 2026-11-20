import { useAuth } from '@/hooks/use-auth';

/**
 * What the signed-in user may do, mirroring the database rules in migration
 * 0004. The UI uses this only to show or hide controls; the database enforces
 * every rule on its own (UAT AUTH-008/009).
 */
export function useRole() {
  const { profile } = useAuth();
  const role = profile?.role;
  const isAdmin = role === 'admin';
  const isContributor = role === 'contributor';
  const isTutor = isContributor && profile?.contributor_type === 'tutor';
  const isVerified = Boolean(profile?.verified);
  const isLearner = role === 'student' || role === 'parent';

  return {
    role,
    isAdmin,
    isContributor,
    isTutor,
    isLearner,
    /** Contributor or tutor whose application hasn't been approved yet. */
    awaitingApproval: isContributor && !isVerified,
    canCategorisePosts: isAdmin || (isContributor && isVerified),
    canHostLive: isAdmin || (isContributor && isVerified && (!isTutor || Boolean(profile?.can_host_live))),
    canSeeAnalytics: isAdmin || (isContributor && isVerified),
    /** Saved Downloads belong to learners; contributors don't get it in their navigation (NAV-003). */
    hasSavedDownloads: isLearner,
  };
}
