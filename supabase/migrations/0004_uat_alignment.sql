-- Career Insight — align the backend with the UAT plan (v1.0, 19 Nov 2026).
-- Every rule here is enforced in the database, not only hidden in the apps
-- (UAT AUTH-008/009, OPP-009, LIVE-003/004, POST-005/008, NFR-001).
-- Run via `supabase db push`.

-- =========================================================================
-- 1. Role helpers
-- =========================================================================

alter table public.user_profiles
  add column if not exists can_host_live boolean not null default false;

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.user_profiles where user_id = auth.uid();
$$;

create or replace function public.is_verified_contributor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and role = 'contributor' and verified
  );
$$;

-- Admins, verified contributors, and verified tutors an admin has granted hosting.
create or replace function public.can_host_live()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid()
      and (
        role = 'admin'
        or (role = 'contributor' and verified
            and (contributor_type is distinct from 'tutor' or can_host_live))
      )
  );
$$;

-- Count-maintaining triggers set this flag so the guard triggers below let
-- their writes through; clients can't set it (it is transaction-local).
create or replace function public.internal_write()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.internal_write', true), '') = 'on';
$$;

-- =========================================================================
-- 2. Profiles: privileged fields and privacy (NFR-001)
-- =========================================================================

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() or public.internal_write() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'Only an admin can create an admin profile';
    end if;
    new.verified := false;
    new.can_host_live := false;
    new.followers_count := 0;
    new.following_count := 0;
  else
    -- Role and contributor type are chosen once at onboarding; later changes go through an admin.
    if new.role is distinct from old.role then
      raise exception 'Only an admin can change your role';
    end if;
    if new.contributor_type is distinct from old.contributor_type then
      raise exception 'Only an admin can change your contributor type';
    end if;
    new.verified := old.verified;
    new.can_host_live := old.can_host_live;
    new.followers_count := old.followers_count;
    new.following_count := old.following_count;
  end if;

  return new;
end;
$$;

-- Full profiles (email, phone, school, linked students…) are now private to the
-- owner and admins. Everyone else reads the public card view below.
drop policy if exists "profiles are readable by authenticated users" on public.user_profiles;
create policy "users read their own profile; admins read all" on public.user_profiles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- Public, non-sensitive profile fields for feeds, search and profile pages.
-- Runs with the view owner's rights so it can read across rows, but only
-- exposes these columns.
create or replace view public.profile_cards as
  select
    user_id,
    role,
    display_name,
    avatar_url,
    bio,
    province,
    contributor_type,
    organization_name,
    organization_logo,
    website,
    verified,
    followers_count,
    following_count,
    created_at
  from public.user_profiles
  where onboarding_complete;

revoke all on public.profile_cards from anon, public;
grant select on public.profile_cards to authenticated;

-- =========================================================================
-- 3. Opportunities: admin-only lifecycle draft → active → closed (archived)
-- =========================================================================

alter table public.opportunities
  add column if not exists published_at timestamptz,
  add column if not exists archived_at timestamptz,
  add column if not exists external_instructions text;

-- Only admins manage opportunities (policy from 0001). Learners see published
-- ones; linked contributors no longer see drafts.
drop policy if exists "active opportunities are readable" on public.opportunities;
create policy "published opportunities are readable" on public.opportunities
  for select to authenticated using (status = 'active' or public.is_admin());

create or replace function public.stamp_opportunity_lifecycle()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    new.published_at := coalesce(new.published_at, now());
    new.archived_at := null;
  end if;
  if new.status = 'closed' and (tg_op = 'INSERT' or old.status is distinct from 'closed') then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists stamp_opportunity_lifecycle on public.opportunities;
create trigger stamp_opportunity_lifecycle
  before insert or update on public.opportunities
  for each row execute function public.stamp_opportunity_lifecycle();

update public.opportunities set published_at = coalesce(published_at, created_at) where status = 'active';

-- =========================================================================
-- 4. Download tracking and Saved Downloads (DL-005…010, ANL-001…006)
-- =========================================================================

-- Raw events. A download event means the file reached the device; it is never
-- evidence that an application was completed or submitted.
create table if not exists public.opportunity_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  opportunity_title text,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'download')),
  created_at timestamptz not null default now()
);
create index if not exists opportunity_events_opp_idx on public.opportunity_events (opportunity_id, event_type, created_at);
create index if not exists opportunity_events_time_idx on public.opportunity_events (event_type, created_at);

alter table public.opportunity_events enable row level security;
create policy "admins read opportunity events" on public.opportunity_events
  for select to authenticated using (public.is_admin());
-- No insert policy: events are written only by the functions below.

-- Keep history from before this migration: every existing Saved Download row was one download.
insert into public.opportunity_events (opportunity_id, opportunity_title, user_id, event_type, created_at)
select a.opportunity_id, a.opportunity_title, a.user_id, 'download', a.download_date
from public.applications a
where not exists (select 1 from public.opportunity_events e where e.event_type = 'download');

-- Saved Downloads: one row per user + opportunity.
alter table public.applications
  add column if not exists last_downloaded_at timestamptz,
  add column if not exists times_downloaded int not null default 1;

with ranked as (
  select id, row_number() over (partition by user_id, opportunity_id order by download_date desc) as rn,
         count(*) over (partition by user_id, opportunity_id) as total
  from public.applications
  where opportunity_id is not null
)
update public.applications a
set times_downloaded = r.total, last_downloaded_at = a.download_date
from ranked r
where a.id = r.id and r.rn = 1;

delete from public.applications a
using (
  select id, row_number() over (partition by user_id, opportunity_id order by download_date desc) as rn
  from public.applications where opportunity_id is not null
) r
where a.id = r.id and r.rn > 1;

update public.applications set last_downloaded_at = coalesce(last_downloaded_at, download_date);

create unique index if not exists applications_user_opportunity_key
  on public.applications (user_id, opportunity_id);

-- Learners may read and remove their own Saved Downloads, but rows are only
-- created by record_form_download (so a row always means a real download).
drop policy if exists "users manage their own applications" on public.applications;
create policy "users read their own saved downloads" on public.applications
  for select to authenticated using (user_id = auth.uid());
create policy "users remove their own saved downloads" on public.applications
  for delete to authenticated using (user_id = auth.uid());

create or replace function public.record_opportunity_view(p_opportunity_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  opp_title text;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select title into opp_title from public.opportunities where id = p_opportunity_id and status = 'active';
  if not found then
    return;
  end if;
  insert into public.opportunity_events (opportunity_id, opportunity_title, user_id, event_type)
  values (p_opportunity_id, opp_title, auth.uid(), 'view');
  update public.opportunities set views_count = views_count + 1 where id = p_opportunity_id;
end;
$$;

revoke all on function public.record_opportunity_view(uuid) from public, anon;
grant execute on function public.record_opportunity_view(uuid) to authenticated;

-- Called by the app only after the form file has been saved on the device.
drop function if exists public.record_form_download(uuid);
create function public.record_form_download(p_opportunity_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  opp public.opportunities%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  select * into opp from public.opportunities where id = p_opportunity_id and status = 'active';
  if not found or opp.form_url is null then
    raise exception 'This opportunity has no downloadable form';
  end if;

  insert into public.opportunity_events (opportunity_id, opportunity_title, user_id, event_type)
  values (opp.id, opp.title, auth.uid(), 'download');

  insert into public.applications (
    user_id, opportunity_id, opportunity_title, opportunity_type,
    organization_name, organization_logo, deadline, form_url,
    download_date, last_downloaded_at, times_downloaded
  ) values (
    auth.uid(), opp.id, opp.title, opp.type,
    opp.contributor_name, opp.contributor_logo, opp.deadline, opp.form_url,
    now(), now(), 1
  )
  on conflict (user_id, opportunity_id) do update set
    opportunity_title = excluded.opportunity_title,
    organization_name = excluded.organization_name,
    deadline = excluded.deadline,
    form_url = excluded.form_url,
    last_downloaded_at = now(),
    times_downloaded = public.applications.times_downloaded + 1;

  update public.opportunities set downloads_count = downloads_count + 1 where id = opp.id;

  return opp.form_url;
end;
$$;

revoke all on function public.record_form_download(uuid) from public, anon;
grant execute on function public.record_form_download(uuid) to authenticated;

-- Weekly chart now counts download events (one per completed download).
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
  select w.week_start::date, count(e.id)
  from generate_series(
    date_trunc('week', now()) - make_interval(weeks => p_weeks - 1),
    date_trunc('week', now()),
    interval '1 week'
  ) as w(week_start)
  left join public.opportunity_events e
    on e.event_type = 'download'
   and e.created_at >= w.week_start
   and e.created_at < w.week_start + interval '1 week'
  group by w.week_start
  order by w.week_start;
end;
$$;

-- Per-opportunity analytics for a date range: views, download events and
-- unique downloaders are reported separately (ANL-003).
create or replace function public.admin_download_analytics(p_from timestamptz, p_to timestamptz)
returns table (
  opportunity_id uuid,
  title text,
  status text,
  views bigint,
  downloads bigint,
  unique_downloaders bigint
)
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
  select
    o.id,
    o.title,
    o.status,
    count(e.id) filter (where e.event_type = 'view'),
    count(e.id) filter (where e.event_type = 'download'),
    count(distinct e.user_id) filter (where e.event_type = 'download')
  from public.opportunities o
  left join public.opportunity_events e
    on e.opportunity_id = o.id and e.created_at >= p_from and e.created_at < p_to
  group by o.id, o.title, o.status
  order by 5 desc, 4 desc, o.title;
end;
$$;

revoke all on function public.admin_download_analytics(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_download_analytics(timestamptz, timestamptz) to authenticated;

-- Platform totals for a date range.
create or replace function public.admin_analytics_summary(p_from timestamptz, p_to timestamptz)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;

  return json_build_object(
    'views', (select count(*) from opportunity_events where event_type = 'view' and created_at >= p_from and created_at < p_to),
    'downloads', (select count(*) from opportunity_events where event_type = 'download' and created_at >= p_from and created_at < p_to),
    'unique_downloaders', (select count(distinct user_id) from opportunity_events where event_type = 'download' and created_at >= p_from and created_at < p_to),
    'new_students', (select count(*) from user_profiles where role = 'student' and created_at >= p_from and created_at < p_to),
    'new_parents', (select count(*) from user_profiles where role = 'parent' and created_at >= p_from and created_at < p_to),
    'posts', (select count(*) from posts where created_at >= p_from and created_at < p_to),
    'comments', (select count(*) from comments where created_at >= p_from and created_at < p_to),
    'likes', (select count(*) from likes where created_at >= p_from and created_at < p_to),
    'live_viewers', (select count(*) from live_stream_views where joined_at >= p_from and joined_at < p_to)
  );
end;
$$;

-- =========================================================================
-- 5. Posts, comments, likes, follows, reports
-- =========================================================================

create or replace function public.guard_post_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.user_profiles%rowtype;
  privileged boolean;
begin
  if auth.uid() is null or public.internal_write() then
    return new;
  end if;

  select * into me from public.user_profiles where user_id = auth.uid();
  privileged := coalesce(me.role = 'admin' or (me.role = 'contributor' and me.verified), false);

  if tg_op = 'INSERT' then
    -- Author details come from the profile, never from the client.
    new.author_name := me.display_name;
    new.author_avatar := me.avatar_url;
    new.author_role := me.role;
    new.likes_count := 0;
    new.comments_count := 0;
    new.shares_count := 0;
    new.featured := false;
    if me.role is distinct from 'admin' then
      new.status := 'published';
    end if;
    -- Students and parents can't categorise posts (POST-005).
    if not privileged then
      new.post_type := null;
    end if;
    return new;
  end if;

  -- UPDATE
  if me.role is not distinct from 'admin' then
    return new;
  end if;
  new.author_id := old.author_id;
  new.author_name := old.author_name;
  new.author_avatar := old.author_avatar;
  new.author_role := old.author_role;
  new.likes_count := old.likes_count;
  new.comments_count := old.comments_count;
  new.shares_count := old.shares_count;
  new.featured := old.featured;
  -- Authors can't un-flag their own reported post.
  new.status := old.status;
  if not privileged then
    new.post_type := old.post_type;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_post_changes on public.posts;
create trigger guard_post_changes
  before insert or update on public.posts
  for each row execute function public.guard_post_changes();

create or replace function public.guard_comment_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.user_profiles%rowtype;
begin
  if auth.uid() is null or public.internal_write() then
    return new;
  end if;
  select * into me from public.user_profiles where user_id = auth.uid();

  if tg_op = 'INSERT' then
    new.author_name := me.display_name;
    new.author_avatar := me.avatar_url;
    new.likes_count := 0;
    new.status := 'published';
    return new;
  end if;

  if me.role is distinct from 'admin' then
    new.post_id := old.post_id;
    new.author_id := old.author_id;
    new.author_name := old.author_name;
    new.author_avatar := old.author_avatar;
    new.likes_count := old.likes_count;
    -- Authors may only remove (soft-delete) their own comment.
    if new.status is distinct from old.status and new.status <> 'removed' then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_comment_changes on public.comments;
create trigger guard_comment_changes
  before insert or update on public.comments
  for each row execute function public.guard_comment_changes();

-- Counters, kept by the database so they can't be forged or drift.
create or replace function public.sync_post_comment_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if tg_op = 'DELETE' then target := old.post_id; else target := new.post_id; end if;
  perform set_config('app.internal_write', 'on', true);
  update public.posts
  set comments_count = (select count(*) from public.comments where post_id = target and status = 'published')
  where id = target;
  perform set_config('app.internal_write', 'off', true);
  return null;
end;
$$;

drop trigger if exists sync_post_comment_count on public.comments;
create trigger sync_post_comment_count
  after insert or delete or update of status on public.comments
  for each row execute function public.sync_post_comment_count();

create or replace function public.sync_like_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_ public.likes%rowtype;
begin
  if tg_op = 'DELETE' then row_ := old; else row_ := new; end if;
  perform set_config('app.internal_write', 'on', true);
  if row_.target_type = 'post' then
    update public.posts
    set likes_count = (select count(*) from public.likes where target_type = 'post' and target_id = row_.target_id)
    where id = row_.target_id;
  else
    update public.comments
    set likes_count = (select count(*) from public.likes where target_type = 'comment' and target_id = row_.target_id)
    where id = row_.target_id;
  end if;
  perform set_config('app.internal_write', 'off', true);
  return null;
end;
$$;

drop trigger if exists sync_like_count on public.likes;
create trigger sync_like_count
  after insert or delete on public.likes
  for each row execute function public.sync_like_count();

create or replace function public.sync_follow_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_ public.follows%rowtype;
begin
  if tg_op = 'DELETE' then row_ := old; else row_ := new; end if;
  perform set_config('app.internal_write', 'on', true);
  update public.user_profiles
  set followers_count = (select count(*) from public.follows where following_id = row_.following_id)
  where user_id = row_.following_id;
  update public.user_profiles
  set following_count = (select count(*) from public.follows where follower_id = row_.follower_id)
  where user_id = row_.follower_id;
  perform set_config('app.internal_write', 'off', true);
  return null;
end;
$$;

drop trigger if exists sync_follow_counts on public.follows;
create trigger sync_follow_counts
  after insert or delete on public.follows
  for each row execute function public.sync_follow_counts();

-- People can't follow themselves.
alter table public.follows drop constraint if exists follows_not_self;
alter table public.follows add constraint follows_not_self check (follower_id <> following_id);

-- Reports (POST-011)
create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(trim(reason)) between 3 and 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (post_id, reporter_id)
);

alter table public.post_reports enable row level security;
create policy "admins read reports" on public.post_reports
  for select to authenticated using (public.is_admin());
create policy "reporters read their own reports" on public.post_reports
  for select to authenticated using (reporter_id = auth.uid());

-- Reporting hides the post from feeds until an admin reviews it.
create or replace function public.report_post(p_post_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  if exists (select 1 from public.posts where id = p_post_id and author_id = auth.uid()) then
    raise exception 'You can''t report your own post';
  end if;

  insert into public.post_reports (post_id, reporter_id, reason)
  values (p_post_id, auth.uid(), trim(p_reason))
  on conflict (post_id, reporter_id) do nothing;

  perform set_config('app.internal_write', 'on', true);
  update public.posts set status = 'flagged' where id = p_post_id and status = 'published';
  perform set_config('app.internal_write', 'off', true);
end;
$$;

revoke all on function public.report_post(uuid, text) from public, anon;
grant execute on function public.report_post(uuid, text) to authenticated;

-- Admin decision on a reported/flagged post: 'restore' or 'remove'.
create or replace function public.moderate_post(p_post_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_action not in ('restore', 'remove') then
    raise exception 'Unknown moderation action';
  end if;

  update public.posts
  set status = case when p_action = 'restore' then 'published' else 'removed' end
  where id = p_post_id;

  update public.post_reports
  set status = case when p_action = 'restore' then 'dismissed' else 'actioned' end,
      resolved_at = now()
  where post_id = p_post_id and status = 'open';
end;
$$;

revoke all on function public.moderate_post(uuid, text) from public, anon;
grant execute on function public.moderate_post(uuid, text) to authenticated;

-- =========================================================================
-- 6. Live sessions (LIVE-001…010): only admins and approved contributors host
-- =========================================================================

alter table public.live_streams
  add column if not exists started_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

drop policy if exists "hosts create their own streams" on public.live_streams;
create policy "approved hosts create their own streams" on public.live_streams
  for insert to authenticated with check (host_id = auth.uid() and public.can_host_live());

drop policy if exists "hosts and admins update streams" on public.live_streams;
create policy "approved hosts and admins update streams" on public.live_streams
  for update to authenticated
  using ((host_id = auth.uid() and public.can_host_live()) or public.is_admin());

create or replace function public.guard_live_stream_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.user_profiles%rowtype;
begin
  if auth.uid() is null or public.internal_write() then
    return new;
  end if;
  select * into me from public.user_profiles where user_id = auth.uid();

  if tg_op = 'INSERT' then
    new.host_name := me.display_name;
    new.host_avatar := me.avatar_url;
    new.host_role := me.role;
    new.viewers_count := 0;
    new.status := 'upcoming';
  else
    new.host_id := old.host_id;
    new.host_name := old.host_name;
    new.host_avatar := old.host_avatar;
    new.host_role := old.host_role;
    new.viewers_count := old.viewers_count;
  end if;

  if new.status = 'live' and (tg_op = 'INSERT' or old.status <> 'live') then
    new.started_at := coalesce(new.started_at, now());
  end if;
  if new.status = 'ended' and (tg_op = 'INSERT' or old.status <> 'ended') then
    new.ended_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_live_stream_changes on public.live_streams;
create trigger guard_live_stream_changes
  before insert or update on public.live_streams
  for each row execute function public.guard_live_stream_changes();

create table if not exists public.live_stream_views (
  stream_id uuid not null references public.live_streams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);

alter table public.live_stream_views enable row level security;
create policy "hosts and admins read viewers" on public.live_stream_views
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.live_streams s where s.id = stream_id and s.host_id = auth.uid())
  );

-- Records that the signed-in user opened a session (one per user), keeping viewers_count in step.
create or replace function public.join_live_stream(p_stream_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  insert into public.live_stream_views (stream_id, user_id) values (p_stream_id, auth.uid())
  on conflict do nothing;
  if found then
    perform set_config('app.internal_write', 'on', true);
    update public.live_streams set viewers_count = viewers_count + 1 where id = p_stream_id;
    perform set_config('app.internal_write', 'off', true);
  end if;
end;
$$;

revoke all on function public.join_live_stream(uuid) from public, anon;
grant execute on function public.join_live_stream(uuid) to authenticated;

-- =========================================================================
-- 7. Contributor analytics, scoped to the caller's own content (ANL-005)
-- =========================================================================

create or replace function public.contributor_analytics(p_from timestamptz, p_to timestamptz)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Not signed in';
  end if;
  if not (public.is_verified_contributor() or public.is_admin()) then
    raise exception 'Analytics are available to approved contributors';
  end if;

  return json_build_object(
    'followers_total', (select followers_count from user_profiles where user_id = me),
    'new_followers', (select count(*) from follows where following_id = me and created_at >= p_from and created_at < p_to),
    'posts', (select count(*) from posts where author_id = me and created_at >= p_from and created_at < p_to),
    'likes', (select count(*) from likes l join posts p on l.target_type = 'post' and l.target_id = p.id
              where p.author_id = me and l.created_at >= p_from and l.created_at < p_to),
    'comments', (select count(*) from comments c join posts p on c.post_id = p.id
                 where p.author_id = me and c.status = 'published' and c.created_at >= p_from and c.created_at < p_to),
    'sessions', (select count(*) from live_streams where host_id = me and created_at >= p_from and created_at < p_to),
    'session_viewers', (select count(*) from live_stream_views v join live_streams s on s.id = v.stream_id
                        where s.host_id = me and v.joined_at >= p_from and v.joined_at < p_to),
    'top_posts', coalesce((
      select json_agg(t) from (
        select id, left(content, 120) as content, likes_count, comments_count, created_at
        from posts where author_id = me and status = 'published'
        order by likes_count + comments_count desc, created_at desc limit 5
      ) t), '[]'::json),
    -- Opportunities an admin linked to this contributor's organisation.
    'opportunities', coalesce((
      select json_agg(t) from (
        select o.id, o.title,
               count(e.id) filter (where e.event_type = 'view') as views,
               count(e.id) filter (where e.event_type = 'download') as downloads,
               count(distinct e.user_id) filter (where e.event_type = 'download') as unique_downloaders
        from opportunities o
        left join opportunity_events e on e.opportunity_id = o.id and e.created_at >= p_from and e.created_at < p_to
        where o.contributor_id = me
        group by o.id, o.title
        order by o.title
      ) t), '[]'::json)
  );
end;
$$;

revoke all on function public.contributor_analytics(timestamptz, timestamptz) from public, anon;
grant execute on function public.contributor_analytics(timestamptz, timestamptz) to authenticated;
revoke all on function public.admin_analytics_summary(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_analytics_summary(timestamptz, timestamptz) to authenticated;

-- =========================================================================
-- 8. Notifications: created only by the database (NOT-001…003, NFR-009)
-- =========================================================================

drop policy if exists "signed-in users can create notifications" on public.notifications;

create or replace function public.notify_learners(p_title text, p_message text, p_link text, p_type text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, message, link)
  select user_id, p_type, p_title, p_message, p_link
  from public.user_profiles
  where role in ('student', 'parent') and onboarding_complete;
$$;
revoke all on function public.notify_learners(text, text, text, text) from public, anon, authenticated;

create or replace function public.notify_on_opportunity_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') then
    perform public.notify_learners('New opportunity', new.title, '/opportunity/' || new.id, 'opportunity');
  end if;
  return null;
end;
$$;

drop trigger if exists notify_on_opportunity_published on public.opportunities;
create trigger notify_on_opportunity_published
  after insert or update of status on public.opportunities
  for each row execute function public.notify_on_opportunity_published();

create or replace function public.notify_on_live_stream()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.notify_learners('Live session scheduled', new.title, '/live/' || new.id, 'system');
  elsif new.status = 'live' and old.status is distinct from 'live' then
    perform public.notify_learners('A live session has started', new.title, '/live/' || new.id, 'system');
  elsif new.recording_url is not null and old.recording_url is null then
    perform public.notify_learners('Recording available', new.title, '/live/' || new.id, 'system');
  end if;
  return null;
end;
$$;

drop trigger if exists notify_on_live_stream on public.live_streams;
create trigger notify_on_live_stream
  after insert or update on public.live_streams
  for each row execute function public.notify_on_live_stream();

create or replace function public.notify_on_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
  actor text;
begin
  select display_name into actor from public.user_profiles where user_id = auth.uid();

  if tg_table_name = 'comments' then
    select author_id into recipient from public.posts where id = new.post_id;
    if recipient is not null and recipient <> new.author_id then
      insert into public.notifications (user_id, type, title, link, actor_name)
      values (recipient, 'comment', 'New comment on your post', '/post/' || new.post_id, actor);
    end if;
  elsif tg_table_name = 'likes' and new.target_type = 'post' then
    select author_id into recipient from public.posts where id = new.target_id;
    if recipient is not null and recipient <> new.user_id then
      insert into public.notifications (user_id, type, title, link, actor_name)
      values (recipient, 'like', 'Someone liked your post', '/post/' || new.target_id, actor);
    end if;
  elsif tg_table_name = 'follows' then
    insert into public.notifications (user_id, type, title, link, actor_name)
    values (new.following_id, 'follow', 'You have a new follower', '/profile/' || new.follower_id, actor);
  end if;
  return null;
end;
$$;

drop trigger if exists notify_on_comment on public.comments;
create trigger notify_on_comment after insert on public.comments
  for each row execute function public.notify_on_engagement();
drop trigger if exists notify_on_like on public.likes;
create trigger notify_on_like after insert on public.likes
  for each row execute function public.notify_on_engagement();
drop trigger if exists notify_on_follow on public.follows;
create trigger notify_on_follow after insert on public.follows
  for each row execute function public.notify_on_engagement();

create or replace function public.notify_on_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.verified and not old.verified then
    insert into public.notifications (user_id, type, title, message, link)
    values (new.user_id, 'system', 'Your contributor account is approved',
            'You can now categorise posts, host live sessions (if permitted) and see analytics.', '/profile');
  end if;
  return null;
end;
$$;

drop trigger if exists notify_on_verification on public.user_profiles;
create trigger notify_on_verification after update of verified on public.user_profiles
  for each row execute function public.notify_on_verification();

-- =========================================================================
-- 9. Admin audit log (ADM-006)
-- =========================================================================

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_name text,
  action text not null,
  target_table text not null,
  target_id uuid,
  target_label text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_time_idx on public.admin_audit_log (created_at desc);

alter table public.admin_audit_log enable row level security;
create policy "admins read the audit log" on public.admin_audit_log
  for select to authenticated using (public.is_admin());
-- No insert/update/delete policies: entries are written only by triggers and can't be altered.

create or replace function public.audit_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  row_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  changes jsonb := '{}'::jsonb;
  k text;
  label text;
  watched text[];
begin
  if public.internal_write() then
    return null;
  end if;
  -- Log actions taken by admins (and direct SQL/CLI changes, where there is no signed-in user).
  if actor is not null and not public.is_admin() then
    return null;
  end if;

  watched := case tg_table_name
    when 'user_profiles' then array['role', 'verified', 'can_host_live', 'contributor_type']
    when 'posts' then array['status', 'post_type']
    else null
  end;

  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(row_new) loop
      if k not in ('updated_at') and row_new -> k is distinct from row_old -> k
         and (watched is null or k = any(watched)) then
        changes := changes || jsonb_build_object(k, jsonb_build_object('from', row_old -> k, 'to', row_new -> k));
      end if;
    end loop;
    if changes = '{}'::jsonb then
      return null;
    end if;
  elsif watched is not null then
    -- Inserts/deletes of profiles and posts by admins aren't the sensitive actions we track.
    return null;
  end if;

  label := coalesce(
    row_new ->> 'title', row_old ->> 'title',
    row_new ->> 'display_name', row_old ->> 'display_name',
    left(coalesce(row_new ->> 'content', row_old ->> 'content'), 80)
  );

  insert into public.admin_audit_log (actor_id, actor_name, action, target_table, target_id, target_label, details)
  values (
    actor,
    coalesce((select display_name from public.user_profiles where user_id = actor), 'Database (SQL)'),
    lower(tg_op),
    tg_table_name,
    coalesce((row_new ->> 'id')::uuid, (row_old ->> 'id')::uuid),
    label,
    case when tg_op = 'UPDATE' then changes else coalesce(row_new, row_old) end
  );
  return null;
end;
$$;

drop trigger if exists audit_opportunities on public.opportunities;
create trigger audit_opportunities after insert or update or delete on public.opportunities
  for each row execute function public.audit_admin_change();
drop trigger if exists audit_user_profiles on public.user_profiles;
create trigger audit_user_profiles after update on public.user_profiles
  for each row execute function public.audit_admin_change();
drop trigger if exists audit_posts on public.posts;
create trigger audit_posts after update on public.posts
  for each row execute function public.audit_admin_change();
drop trigger if exists audit_live_streams on public.live_streams;
create trigger audit_live_streams after insert or update or delete on public.live_streams
  for each row execute function public.audit_admin_change();

-- =========================================================================
-- 10. Storage: type/size limits and write permissions (OPP-008, POST-012)
-- =========================================================================

update storage.buckets
set file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'public-media';

update storage.buckets
set file_size_limit = 10 * 1024 * 1024,
    allowed_mime_types = array[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
where id = 'forms';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recordings', 'recordings', true, 50 * 1024 * 1024, array['video/mp4', 'video/quicktime'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "admins replace and delete forms" on storage.objects
  for update to authenticated using (bucket_id = 'forms' and public.is_admin());
create policy "admins delete forms" on storage.objects
  for delete to authenticated using (bucket_id = 'forms' and public.is_admin());

create policy "users delete their own media" on storage.objects
  for delete to authenticated using (bucket_id = 'public-media' and owner = auth.uid());

create policy "recordings are publicly readable" on storage.objects
  for select using (bucket_id = 'recordings');
create policy "hosts upload recordings" on storage.objects
  for insert to authenticated with check (bucket_id = 'recordings' and public.can_host_live());
create policy "hosts delete their own recordings" on storage.objects
  for delete to authenticated using (bucket_id = 'recordings' and (owner = auth.uid() or public.is_admin()));
