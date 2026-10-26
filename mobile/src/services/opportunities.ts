import { supabase } from '@/lib/supabase';
import type { Application, Opportunity, OpportunityType } from '@/types/models';

export const OPPORTUNITIES_PAGE_SIZE = 20;

export type OpportunityFilters = {
  search: string;
  type: OpportunityType | null;
};

export async function listOpportunities(filters: OpportunityFilters, page: number) {
  const from = page * OPPORTUNITIES_PAGE_SIZE;
  let query = supabase
    .from('opportunities')
    .select('*')
    // RLS also lets contributors see their own drafts; students only want live ones.
    .eq('status', 'active');

  const search = filters.search.trim();
  if (search) {
    // Strip characters that would break PostgREST's or() filter syntax.
    const term = search.replace(/[,()%*]/g, ' ');
    query = query.or(`title.ilike.%${term}%,contributor_name.ilike.%${term}%`);
  }
  if (filters.type) query = query.eq('type', filters.type);

  const { data, error } = await query
    .order('featured', { ascending: false })
    .order('deadline', { ascending: true, nullsFirst: false })
    .range(from, from + OPPORTUNITIES_PAGE_SIZE - 1)
    .returns<Opportunity[]>();
  if (error) throw error;
  return data;
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

export async function isOpportunitySaved(userId: string, opportunityId: string) {
  const { count, error } = await supabase
    .from('saved_items')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('item_type', 'opportunity')
    .eq('item_id', opportunityId);
  if (error) throw error;
  return (count ?? 0) > 0;
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
