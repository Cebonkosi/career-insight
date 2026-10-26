import { useAuth } from './useAuth'

/** Convenience accessor for the current user's profile + onboarding/loading state. */
export function useUserProfile() {
  const { profile, loading, refreshProfile, user } = useAuth()
  return {
    profile,
    loading,
    refreshProfile,
    needsOnboarding: !loading && Boolean(user) && !profile,
  }
}
