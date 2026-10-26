-- Career Insight — initial schema, RLS policies, and storage buckets.
-- Run via `supabase db push`, or paste into the Supabase SQL editor.

create extension if not exists "pgcrypto";

-- =========================================================================
-- Tables
-- =========================================================================

create table public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'parent', 'contributor', 'admin')),
  display_name text not null,
  avatar_url text,
  bio text,
  province text,
  city text,
  phone text,
  email text,
  grade int check (grade between 8 and 12),
  school text,
  subjects text[] default '{}',
  interests text[] default '{}',
  parent_linked_students text[] default '{}',
  contributor_type text check (contributor_type in ('university', 'college', 'company', 'ngo', 'government', 'professional', 'tutor')),
  organization_name text,
  organization_logo text,
  website text,
  verified boolean not null default false,
  onboarding_complete boolean not null default false,
  followers_count int not null default 0,
  following_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.careers (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  category text check (category in (
    'science_technology', 'healthcare', 'business_finance', 'arts_creative', 'engineering',
    'education', 'law_government', 'agriculture_environment', 'trades_services', 'media_communication'
  )),
  description text,
  overview text,
  salary_range_min int,
  salary_range_max int,
  demand_level text check (demand_level in ('high', 'medium', 'low')),
  required_subjects text[] default '{}',
  recommended_subjects text[] default '{}',
  skills_needed text[] default '{}',
  qualifications text[] default '{}',
  duration_years numeric,
  image_url text,
  roadmap_steps jsonb default '[]',
  related_careers uuid[] default '{}',
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('published', 'draft')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in (
    'scholarship', 'bursary', 'internship', 'learnnership', 'open_day',
    'workshop', 'competition', 'mentorship', 'volunteer'
  )),
  contributor_id uuid references auth.users(id) on delete set null,
  contributor_name text,
  contributor_logo text,
  description text,
  requirements text,
  eligibility_grades int[] default '{}',
  application_url text,
  form_url text,
  deadline timestamptz,
  location text,
  is_remote boolean not null default false,
  province text,
  value text,
  career_categories text[] default '{}',
  image_url text,
  status text not null default 'pending_review' check (status in ('active', 'closed', 'draft', 'pending_review')),
  featured boolean not null default false,
  views_count int not null default 0,
  saves_count int not null default 0,
  downloads_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  author_avatar text,
  author_role text,
  content text not null,
  media_urls text[] default '{}',
  post_type text check (post_type in ('article', 'tip', 'story', 'announcement', 'question')),
  career_tags text[] default '{}',
  likes_count int not null default 0,
  comments_count int not null default 0,
  shares_count int not null default 0,
  status text not null default 'published' check (status in ('published', 'draft', 'flagged', 'removed')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  author_avatar text,
  content text not null,
  parent_comment_id uuid references public.comments(id) on delete cascade,
  likes_count int not null default 0,
  status text not null default 'published' check (status in ('published', 'flagged', 'removed')),
  created_at timestamptz not null default now()
);

create table public.likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('post', 'comment')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, following_id)
);

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]',
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text,
  author_avatar text,
  author_role text,
  status text not null default 'active' check (status in ('active', 'closed')),
  total_votes int not null default 0,
  voters jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table public.live_streams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  stream_url text not null,
  host_id uuid not null references auth.users(id) on delete cascade,
  host_name text,
  host_avatar text,
  host_role text,
  status text not null default 'upcoming' check (status in ('upcoming', 'live', 'ended')),
  scheduled_date timestamptz,
  category text,
  image_url text,
  viewers_count int not null default 0,
  recording_url text,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunities(id) on delete set null,
  opportunity_title text,
  opportunity_type text,
  organization_name text,
  organization_logo text,
  download_date timestamptz not null default now(),
  deadline timestamptz,
  form_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('career', 'opportunity', 'post')),
  item_id uuid not null,
  item_title text,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'comment', 'follow', 'opportunity', 'system', 'mention')),
  title text not null,
  message text,
  link text,
  read boolean not null default false,
  actor_name text,
  actor_avatar text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- Helper: is_admin() — security definer so RLS on user_profiles doesn't
-- recurse when a policy on user_profiles itself calls this function.
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- =========================================================================
-- Row Level Security
-- =========================================================================

alter table public.user_profiles enable row level security;
alter table public.careers enable row level security;
alter table public.opportunities enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.likes enable row level security;
alter table public.follows enable row level security;
alter table public.polls enable row level security;
alter table public.live_streams enable row level security;
alter table public.applications enable row level security;
alter table public.saved_items enable row level security;
alter table public.notifications enable row level security;

-- user_profiles: profiles are public to any signed-in user; only the owner
-- (or an admin, for verification) can write.
create policy "profiles are readable by authenticated users" on public.user_profiles
  for select to authenticated using (true);
create policy "users can insert their own profile" on public.user_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "users can update their own profile" on public.user_profiles
  for update to authenticated using (user_id = auth.uid() or public.is_admin());

-- careers: published rows are public; only admins manage them.
create policy "published careers are readable" on public.careers
  for select to authenticated using (status = 'published' or public.is_admin());
create policy "admins manage careers" on public.careers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- opportunities: active rows are public; contributors see their own submissions; admins manage all.
create policy "active opportunities are readable" on public.opportunities
  for select to authenticated using (
    status = 'active' or contributor_id = auth.uid() or public.is_admin()
  );
create policy "admins manage opportunities" on public.opportunities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- posts: published rows are public; authors manage their own; admins moderate all.
create policy "published posts are readable" on public.posts
  for select to authenticated using (
    status = 'published' or author_id = auth.uid() or public.is_admin()
  );
create policy "authors create their own posts" on public.posts
  for insert to authenticated with check (author_id = auth.uid());
create policy "authors and admins update posts" on public.posts
  for update to authenticated using (author_id = auth.uid() or public.is_admin());
create policy "authors and admins delete posts" on public.posts
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- comments
create policy "published comments are readable" on public.comments
  for select to authenticated using (
    status = 'published' or author_id = auth.uid() or public.is_admin()
  );
create policy "authors create their own comments" on public.comments
  for insert to authenticated with check (author_id = auth.uid());
create policy "authors and admins update comments" on public.comments
  for update to authenticated using (author_id = auth.uid() or public.is_admin());
create policy "authors and admins delete comments" on public.comments
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- likes
create policy "likes are readable" on public.likes
  for select to authenticated using (true);
create policy "users manage their own likes" on public.likes
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- follows
create policy "follows are readable" on public.follows
  for select to authenticated using (true);
create policy "users manage their own follows" on public.follows
  for all to authenticated using (follower_id = auth.uid()) with check (follower_id = auth.uid());

-- polls (voting updates options/total_votes/voters, so any signed-in user may update)
create policy "polls are readable" on public.polls
  for select to authenticated using (true);
create policy "authors create their own polls" on public.polls
  for insert to authenticated with check (author_id = auth.uid());
create policy "signed-in users can vote on polls" on public.polls
  for update to authenticated using (true);
create policy "authors and admins delete polls" on public.polls
  for delete to authenticated using (author_id = auth.uid() or public.is_admin());

-- live_streams
create policy "streams are readable" on public.live_streams
  for select to authenticated using (true);
create policy "hosts create their own streams" on public.live_streams
  for insert to authenticated with check (host_id = auth.uid());
create policy "hosts and admins update streams" on public.live_streams
  for update to authenticated using (host_id = auth.uid() or public.is_admin());
create policy "hosts and admins delete streams" on public.live_streams
  for delete to authenticated using (host_id = auth.uid() or public.is_admin());

-- applications: private to the owner
create policy "users manage their own applications" on public.applications
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- saved_items: private to the owner
create policy "users manage their own saved items" on public.saved_items
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: recipients read/update/delete their own; any signed-in user can
-- create a notification addressed to someone else (e.g. on follow/like).
create policy "users read their own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy "signed-in users can create notifications" on public.notifications
  for insert to authenticated with check (true);
create policy "users update their own notifications" on public.notifications
  for update to authenticated using (user_id = auth.uid());
create policy "users delete their own notifications" on public.notifications
  for delete to authenticated using (user_id = auth.uid());

-- =========================================================================
-- Storage buckets
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('public-media', 'public-media', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('forms', 'forms', true)
on conflict (id) do nothing;

create policy "public-media is publicly readable" on storage.objects
  for select using (bucket_id = 'public-media');
create policy "authenticated users can upload public-media" on storage.objects
  for insert to authenticated with check (bucket_id = 'public-media');

create policy "forms are publicly readable" on storage.objects
  for select using (bucket_id = 'forms');
create policy "admins can upload forms" on storage.objects
  for insert to authenticated with check (bucket_id = 'forms' and public.is_admin());
