import { supabase } from '@/lib/supabase';
import type { ContributorType, UserProfile, UserRole } from '@/types/models';

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
