import { supabase } from '@/lib/supabase';
import type { Application, Opportunity, OpportunityType, UserProfile } from '@/types/models';

export const OPPORTUNITIES_PAGE_SIZE = 20;

export type OpportunitySort = 'closing_soon' | 'newest';

export type OpportunityFilters = {
  search: string;
  type: OpportunityType | null;
  /** Only opportunities open to this grade (or to every grade). */
  grade: number | null;
  /** Only opportunities in this province, nationwide, or remote. */
  province: string | null;
  /** Only these ids; used for the "Saved" filter. */
  ids: string[] | null;
  sort: OpportunitySort;
};

export async function listOpportunities(filters: OpportunityFilters, page: number) {
  if (filters.ids && filters.ids.length === 0) return { rows: [] as Opportunity[], count: 0 };

  const from = page * OPPORTUNITIES_PAGE_SIZE;
  let query = supabase
    .from('opportunities')
    .select('*', { count: 'exact' })
    // RLS also lets contributors see their own drafts; students only want live ones.
    .eq('status', 'active');

  const search = filters.search.trim();
  if (search) {
    // Strip characters that would break PostgREST's or() filter syntax.
    const term = search.replace(/[,()%*]/g, ' ');
    query = query.or(`title.ilike.%${term}%,contributor_name.ilike.%${term}%`);
  }
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.grade) query = query.or(`eligibility_grades.cs.{${filters.grade}},eligibility_grades.eq.{}`);
  if (filters.province) {
    query = query.or(`province.eq."${filters.province}",province.is.null,is_remote.eq.true`);
  }
  if (filters.ids) query = query.in('id', filters.ids);

  query =
    filters.sort === 'closing_soon'
      ? query.order('deadline', { ascending: true, nullsFirst: false })
      : query.order('created_at', { ascending: false });

  const { data, error, count } = await query
    .range(from, from + OPPORTUNITIES_PAGE_SIZE - 1)
    .returns<Opportunity[]>();
  if (error) throw error;
  return { rows: data, count: count ?? 0 };
}

export async function getOpportunity(id: string) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single<Opportunity>();
  if (error) throw error;
  return data;
}

/** The posting contributor's profile, for the "Verified contributor" line. */
export async function getContributorProfile(contributorId: string) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', contributorId)
    .maybeSingle<UserProfile>();
  if (error) throw error;
  return data;
}

/** Logs the download against the signed-in user and returns the form URL to open. */
export async function recordFormDownload(opportunityId: string) {
  const { data, error } = await supabase.rpc('record_form_download', {
    p_opportunity_id: opportunityId,
  });
  if (error) throw error;
  return data as string;
}

export async function listMyApplications(userId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('user_id', userId)
    .order('download_date', { ascending: false })
    .returns<Application[]>();
  if (error) throw error;
  return data;
}

export async function listSavedOpportunityIds(userId: string) {
  const { data, error } = await supabase
    .from('saved_items')
    .select('item_id')
    .eq('user_id', userId)
    .eq('item_type', 'opportunity')
    .returns<{ item_id: string }[]>();
  if (error) throw error;
  return data.map((row) => row.item_id);
}

export async function setOpportunitySaved(
  userId: string,
  opportunity: Pick<Opportunity, 'id' | 'title'>,
  saved: boolean,
) {
  const { error } = saved
    ? await supabase.from('saved_items').insert({
        user_id: userId,
        item_type: 'opportunity',
        item_id: opportunity.id,
        item_title: opportunity.title,
      })
    : await supabase
        .from('saved_items')
        .delete()
        .eq('user_id', userId)
        .eq('item_type', 'opportunity')
        .eq('item_id', opportunity.id);
  if (error) throw error;
}
