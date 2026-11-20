-- Career Insight — support the admin console's opportunity review and download
-- analytics (Admin overview / Opportunity review designs).
-- Run via `supabase db push`, or paste into the Supabase SQL editor.

-- =========================================================================
-- Opportunity review: a real "rejected" status plus who decided, when, and why.
-- Rejections used to be stored as 'closed', which also means "deadline passed".
-- =========================================================================

alter table public.opportunities drop constraint if exists opportunities_status_check;
alter table public.opportunities add constraint opportunities_status_check
  check (status in ('active', 'closed', 'draft', 'pending_review', 'rejected'));

alter table public.opportunities
  add column if not exists review_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

-- =========================================================================
-- Download analytics
-- =========================================================================

-- Admins need every learner's download events for platform totals.
create policy "admins read all applications" on public.applications
  for select to authenticated using (public.is_admin());

-- Weekly download counts for the overview chart, oldest week first. Aggregating
-- here avoids shipping every event row to the browser.
create or replace function public.admin_weekly_downloads(p_weeks int default 8)
returns table (week_start date, downloads bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return query
  select w.week_start::date, count(a.id)
  from generate_series(
    date_trunc('week', now()) - make_interval(weeks => p_weeks - 1),
    date_trunc('week', now()),
    interval '1 week'
  ) as w(week_start)
  left join public.applications a
    on a.download_date >= w.week_start
   and a.download_date < w.week_start + interval '1 week'
  group by w.week_start
  order by w.week_start;
end;
$$;

revoke all on function public.admin_weekly_downloads(int) from public, anon;
grant execute on function public.admin_weekly_downloads(int) to authenticated;
