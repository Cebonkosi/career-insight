import { supabase } from '@/lib/supabase';
import type { ContributorAnalytics, PlatformAnalytics } from '@/types/models';

export type DateRange = { from: Date; to: Date };

export function lastDays(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to };
}

/** The caller's own content only; the database refuses anyone who isn't an approved contributor or admin. */
export async function fetchContributorAnalytics({ from, to }: DateRange) {
  const { data, error } = await supabase.rpc('contributor_analytics', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  return data as ContributorAnalytics;
}

export async function fetchPlatformAnalytics({ from, to }: DateRange) {
  const { data, error } = await supabase.rpc('admin_analytics_summary', {
    p_from: from.toISOString(),
    p_to: to.toISOString(),
  });
  if (error) throw error;
  return data as PlatformAnalytics;
}
