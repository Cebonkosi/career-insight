import { supabase } from '@/lib/supabase';
import type { Opportunity, OpportunityType, ProfileCard, SavedDownload } from '@/types/models';

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

/** The linked provider's public profile card, for the "Verified contributor" line. */
export async function getContributorProfile(contributorId: string) {
  const { data, error } = await supabase
    .from('profile_cards')
    .select('*')
    .eq('user_id', contributorId)
    .maybeSingle<ProfileCard>();
  if (error) throw error;
  return data;
}

/** Newest published opportunities for the Home row. */
export async function listLatestOpportunities(limit = 10) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('status', 'active')
    .order('featured', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<Opportunity[]>();
  if (error) throw error;
  return data;
}

/** Counts a detail-page view for analytics. Failures are ignored: a view is never worth an error. */
export async function recordOpportunityView(opportunityId: string) {
  await supabase.rpc('record_opportunity_view', { p_opportunity_id: opportunityId });
}

/**
 * Records a completed download. Call this only after the file is saved on the
 * device, so failed downloads are never counted (UAT DL-004, ANL-002).
 */
export async function recordFormDownload(opportunityId: string) {
  const { error } = await supabase.rpc('record_form_download', {
    p_opportunity_id: opportunityId,
  });
  if (error) throw error;
}

export async function listSavedDownloads(userId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select('id, opportunity_id, opportunity_title, opportunity_type, organization_name, download_date, last_downloaded_at, times_downloaded, deadline, form_url')
    .eq('user_id', userId)
    .order('last_downloaded_at', { ascending: false, nullsFirst: false })
    .returns<SavedDownload[]>();
  if (error) throw error;
  return data;
}

export async function removeSavedDownload(id: string) {
  const { error } = await supabase.from('applications').delete().eq('id', id);
  if (error) throw error;
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
