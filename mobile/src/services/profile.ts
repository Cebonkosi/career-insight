import { supabase } from '@/lib/supabase';
import type { ContributorType, ProfileCard, UserProfile, UserRole } from '@/types/models';

export async function getMyProfile(userId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<UserProfile>();
  if (error) throw error;
  return data;
}

export type NewProfile = {
  user_id: string;
  role: Exclude<UserRole, 'admin'>;
  display_name: string;
  province: string | null;
  grade: number | null;
  school: string | null;
  contributor_type: ContributorType | null;
  organization_name: string | null;
};

export async function createProfile(profile: NewProfile) {
  const { error } = await supabase
    .from('user_profiles')
    .insert({ ...profile, onboarding_complete: true });
  if (error) throw error;
}

/** Fields a user may change on their own profile; role, type and verification are admin-only. */
export type ProfileEdits = Pick<
  UserProfile,
  'display_name' | 'bio' | 'province' | 'city' | 'school' | 'grade' | 'organization_name' | 'website' | 'avatar_url'
>;

export async function updateMyProfile(userId: string, edits: Partial<ProfileEdits>) {
  const { error } = await supabase.from('user_profiles').update(edits).eq('user_id', userId);
  if (error) throw error;
}

// Other people are read through the `profile_cards` view, which exposes no
// contact details (UAT NFR-001).

export async function getProfileCard(userId: string) {
  const { data, error } = await supabase
    .from('profile_cards')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<ProfileCard>();
  if (error) throw error;
  return data;
}

/** Contributor and tutor profiles, optionally filtered by name or organisation. */
export async function searchProfiles(search: string, limit = 20) {
  let query = supabase.from('profile_cards').select('*').eq('role', 'contributor');
  const term = search.trim().replace(/[,()%*]/g, ' ');
  if (term) query = query.or(`display_name.ilike.%${term}%,organization_name.ilike.%${term}%`);
  const { data, error } = await query
    .order('verified', { ascending: false })
    .order('followers_count', { ascending: false })
    .limit(limit)
    .returns<ProfileCard[]>();
  if (error) throw error;
  return data;
}

export async function listFollowingIds(userId: string) {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .returns<{ following_id: string }[]>();
  if (error) throw error;
  return data.map((row) => row.following_id);
}

export async function setFollowing(userId: string, targetId: string, follow: boolean) {
  const { error } = follow
    ? await supabase.from('follows').insert({ follower_id: userId, following_id: targetId })
    : await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', targetId);
  if (error) throw error;
}
