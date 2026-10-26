-- Career Insight — lock down privileged profile fields, and let students record
-- form downloads without needing write access to opportunities.
-- Run via `supabase db push`, or paste into the Supabase SQL editor.

-- =========================================================================
-- Profile role guard
--
-- The insert/update policies on user_profiles only check ownership, so any
-- signed-in user could give themselves role = 'admin' or verified = true.
-- The admin web app trusts the role, so non-admins must not be able to set it.
-- Requests with no auth.uid() (SQL editor, service role) are trusted; promote
-- admins from there.
-- =========================================================================

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.role = 'admin' then
      raise exception 'Only an admin can create an admin profile';
    end if;
    new.verified := false;
  else
    if new.role is distinct from old.role and (new.role = 'admin' or old.role = 'admin') then
      raise exception 'Only an admin can change admin roles';
    end if;
    new.verified := old.verified;
  end if;

  return new;
end;
$$;

create trigger guard_profile_privileges
  before insert or update on public.user_profiles
  for each row execute function public.guard_profile_privileges();

-- =========================================================================
-- record_form_download(opportunity_id)
--
-- Logs the download in the caller's applications and bumps downloads_count in
-- one step. Returns the form URL so the client can open it.
-- =========================================================================

create or replace function public.record_form_download(p_opportunity_id uuid)
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

  select * into opp from public.opportunities
  where id = p_opportunity_id and status = 'active';

  if not found or opp.form_url is null then
    raise exception 'This opportunity has no downloadable form';
  end if;

  insert into public.applications (
    user_id, opportunity_id, opportunity_title, opportunity_type,
    organization_name, organization_logo, deadline, form_url
  ) values (
    auth.uid(), opp.id, opp.title, opp.type,
    opp.contributor_name, opp.contributor_logo, opp.deadline, opp.form_url
  );

  update public.opportunities
  set downloads_count = downloads_count + 1
  where id = opp.id;

  return opp.form_url;
end;
$$;

revoke all on function public.record_form_download(uuid) from public, anon;
grant execute on function public.record_form_download(uuid) to authenticated;
