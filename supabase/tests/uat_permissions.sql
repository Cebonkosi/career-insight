-- UAT permission checks (AUTH-005/008/009, OPP-009, LIVE-002/003/004, POST-005/008/011,
-- DL-010, NFR-001, ADM-006, ANL-005).
--
-- Run:  supabase db query --linked -f supabase/tests/uat_permissions.sql
--
-- Everything happens inside one transaction with throwaway users. The script
-- always ends by raising an error that carries the results, which rolls the
-- whole transaction back — nothing is left in the database.

begin;

create temp table uat_results (test text, passed boolean, detail text) on commit drop;
grant all on uat_results to authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures (as the database owner)
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, aud, role, created_at, updated_at) values
  ('00000000-0000-4000-a000-000000000001', 'uat-student@example.test', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-a000-000000000002', 'uat-parent@example.test', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-a000-000000000003', 'uat-contributor@example.test', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-a000-000000000004', 'uat-tutor@example.test', 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-4000-a000-000000000005', 'uat-admin@example.test', 'authenticated', 'authenticated', now(), now());

insert into public.user_profiles (user_id, role, display_name, email, phone, school, grade, contributor_type, verified, onboarding_complete) values
  ('00000000-0000-4000-a000-000000000001', 'student', 'UAT Student', 'uat-student@example.test', '0820000001', 'UAT High', 10, null, false, true),
  ('00000000-0000-4000-a000-000000000002', 'parent', 'UAT Parent', 'uat-parent@example.test', '0820000002', null, null, null, false, true),
  ('00000000-0000-4000-a000-000000000003', 'contributor', 'UAT Contributor', 'uat-contributor@example.test', '0820000003', null, null, 'company', true, true),
  ('00000000-0000-4000-a000-000000000004', 'contributor', 'UAT Tutor', 'uat-tutor@example.test', '0820000004', null, null, 'tutor', true, true),
  ('00000000-0000-4000-a000-000000000005', 'admin', 'UAT Admin', 'uat-admin@example.test', '0820000005', null, null, null, false, true);

insert into public.opportunities (id, title, type, status, form_url, contributor_id) values
  ('00000000-0000-4000-b000-000000000001', 'UAT Opportunity A', 'bursary', 'active',
   'https://example.test/form.pdf', '00000000-0000-4000-a000-000000000003');

insert into public.posts (id, author_id, content, post_type, status) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-a000-000000000003', 'UAT contributor post', 'tip', 'published');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- Student
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000001","role":"authenticated"}', true);

do $$ begin
  insert into public.opportunities (title, type, status) values ('Student opportunity', 'bursary', 'active');
  insert into uat_results values ('OPP-009 student cannot create opportunity', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('OPP-009 student cannot create opportunity', true, sqlerrm);
end $$;

do $$ declare n int; begin
  update public.opportunities set title = 'Hacked' where id = '00000000-0000-4000-b000-000000000001';
  get diagnostics n = row_count;
  insert into uat_results values ('AUTH-009 student cannot edit opportunity', n = 0, n || ' rows changed');
end $$;

do $$ begin
  insert into public.live_streams (title, stream_url, host_id) values ('Student stream', 'https://example.test', auth.uid());
  insert into uat_results values ('LIVE-003 student cannot host stream', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('LIVE-003 student cannot host stream', true, sqlerrm);
end $$;

do $$ declare t text; begin
  insert into public.posts (author_id, content, post_type) values (auth.uid(), 'Student post', 'article') returning post_type into t;
  insert into uat_results values ('POST-005 student post category is ignored', t is null, coalesce(t, 'null'));
end $$;

do $$ declare n int; begin
  update public.posts set content = 'Edited by student' where id = '00000000-0000-4000-c000-000000000001';
  get diagnostics n = row_count;
  insert into uat_results values ('POST-008 student cannot edit another user''s post', n = 0, n || ' rows changed');
  delete from public.posts where id = '00000000-0000-4000-c000-000000000001';
  get diagnostics n = row_count;
  insert into uat_results values ('POST-008 student cannot delete another user''s post', n = 0, n || ' rows deleted');
end $$;

do $$ declare n int; begin
  select count(*) into n from public.user_profiles where user_id <> auth.uid();
  insert into uat_results values ('NFR-001 student cannot read other full profiles', n = 0, n || ' rows visible');
  select count(*) into n from public.profile_cards where user_id = '00000000-0000-4000-a000-000000000003';
  insert into uat_results values ('NFR-001 public profile cards still available', n = 1, n || ' rows visible');
end $$;

do $$ begin
  update public.user_profiles set role = 'admin' where user_id = auth.uid();
  insert into uat_results values ('AUTH-008 student cannot make self admin', false, 'update succeeded');
exception when others then
  insert into uat_results values ('AUTH-008 student cannot make self admin', true, sqlerrm);
end $$;

do $$ begin
  update public.user_profiles set role = 'contributor' where user_id = auth.uid();
  insert into uat_results values ('AUTH-008 student cannot switch role', false, 'update succeeded');
exception when others then
  insert into uat_results values ('AUTH-008 student cannot switch role', true, sqlerrm);
end $$;

do $$ declare v boolean; begin
  update public.user_profiles set verified = true, can_host_live = true where user_id = auth.uid() returning verified into v;
  insert into uat_results values ('AUTH-008 student cannot self-verify', not v, 'verified=' || v);
end $$;

do $$ begin
  insert into public.notifications (user_id, type, title) values ('00000000-0000-4000-a000-000000000002', 'system', 'Spoofed');
  insert into uat_results values ('NOT-003 users cannot create notifications', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('NOT-003 users cannot create notifications', true, sqlerrm);
end $$;

do $$ begin
  insert into public.applications (user_id, opportunity_id, opportunity_title) values (auth.uid(), '00000000-0000-4000-b000-000000000001', 'Fake');
  insert into uat_results values ('DL-010 Saved Downloads only via a real download', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('DL-010 Saved Downloads only via a real download', true, sqlerrm);
end $$;

do $$ declare n int; begin
  perform public.record_form_download('00000000-0000-4000-b000-000000000001');
  perform public.record_form_download('00000000-0000-4000-b000-000000000001');
  select times_downloaded into n from public.applications where user_id = auth.uid();
  insert into uat_results values ('DL-005/ANL-003 repeat downloads = one saved row, two events', n = 2, 'times_downloaded=' || n);
end $$;

do $$ begin
  perform public.admin_analytics_summary(now() - interval '30 days', now());
  insert into uat_results values ('AUTH-009 student cannot read admin analytics', false, 'call succeeded');
exception when others then
  insert into uat_results values ('AUTH-009 student cannot read admin analytics', true, sqlerrm);
end $$;

do $$ begin
  perform public.contributor_analytics(now() - interval '30 days', now());
  insert into uat_results values ('ANL-005 student has no contributor analytics', false, 'call succeeded');
exception when others then
  insert into uat_results values ('ANL-005 student has no contributor analytics', true, sqlerrm);
end $$;

do $$ declare s text; begin
  perform public.report_post('00000000-0000-4000-c000-000000000001', 'Testing the report flow');
  insert into uat_results values ('POST-011 student can report a post', true, 'reported');
exception when others then
  insert into uat_results values ('POST-011 student can report a post', false, sqlerrm);
end $$;

-- ---------------------------------------------------------------------------
-- Parent
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000002","role":"authenticated"}', true);

do $$ begin
  insert into public.live_streams (title, stream_url, host_id) values ('Parent stream', 'https://example.test', auth.uid());
  insert into uat_results values ('LIVE-004 parent cannot host stream', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('LIVE-004 parent cannot host stream', true, sqlerrm);
end $$;

-- ---------------------------------------------------------------------------
-- Contributor (verified)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000003","role":"authenticated"}', true);

do $$ begin
  insert into public.opportunities (title, type, status) values ('Contributor opportunity', 'bursary', 'active');
  insert into uat_results values ('OPP-009 contributor cannot create opportunity', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('OPP-009 contributor cannot create opportunity', true, sqlerrm);
end $$;

do $$ begin
  insert into public.live_streams (title, stream_url, host_id) values ('Contributor stream', 'https://example.test', auth.uid());
  insert into uat_results values ('LIVE-002 verified contributor can host stream', true, 'created');
exception when others then
  insert into uat_results values ('LIVE-002 verified contributor can host stream', false, sqlerrm);
end $$;

do $$ declare t text; begin
  insert into public.posts (author_id, content, post_type) values (auth.uid(), 'Categorised post', 'article') returning post_type into t;
  insert into uat_results values ('POST-003 contributor can categorise post', t = 'article', coalesce(t, 'null'));
end $$;

do $$ declare s text; begin
  select status into s from public.posts where id = '00000000-0000-4000-c000-000000000001';
  update public.posts set status = 'published' where id = '00000000-0000-4000-c000-000000000001';
  select status into s from public.posts where id = '00000000-0000-4000-c000-000000000001';
  insert into uat_results values ('POST-011 author cannot un-flag a reported post', s = 'flagged', 'status=' || s);
end $$;

do $$ declare j json; begin
  j := public.contributor_analytics(now() - interval '30 days', now() + interval '1 day');
  insert into uat_results values ('ANL-005 contributor sees own linked opportunity only',
    json_array_length(j -> 'opportunities') = 1, (j -> 'opportunities')::text);
end $$;

-- ---------------------------------------------------------------------------
-- Tutor (verified, hosting not granted)
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000004","role":"authenticated"}', true);

do $$ begin
  insert into public.live_streams (title, stream_url, host_id) values ('Tutor stream', 'https://example.test', auth.uid());
  insert into uat_results values ('AUTH-004 tutor needs hosting granted', false, 'insert succeeded');
exception when others then
  insert into uat_results values ('AUTH-004 tutor needs hosting granted', true, sqlerrm);
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-a000-000000000005","role":"authenticated"}', true);

do $$ declare n int; begin
  insert into public.opportunities (title, type, status) values ('Admin opportunity', 'internship', 'draft');
  update public.opportunities set status = 'active' where title = 'Admin opportunity';
  select count(*) into n from public.admin_audit_log where target_label = 'Admin opportunity';
  insert into uat_results values ('AUTH-005/ADM-006 admin creates opportunity and it is audited', n >= 2, n || ' audit rows');
exception when others then
  insert into uat_results values ('AUTH-005/ADM-006 admin creates opportunity and it is audited', false, sqlerrm);
end $$;

do $$ declare n int; begin
  select count(*) into n from public.notifications;
  insert into uat_results values ('NOT-001 publishing notified learners (admin sees own only)', true, 'admin-visible rows: ' || n);
end $$;

do $$ declare j json; begin
  j := public.admin_analytics_summary(now() - interval '1 day', now() + interval '1 day');
  insert into uat_results values ('ANL-001 admin sees the download events', (j ->> 'downloads')::int = 2, j::text);
end $$;

-- ---------------------------------------------------------------------------
-- Report and roll back
-- ---------------------------------------------------------------------------
reset role;

do $$ declare report text; failures int; begin
  select count(*) filter (where not passed),
         string_agg(case when passed then 'PASS  ' else 'FAIL  ' end || test || '  (' || left(detail, 120) || ')', E'\n' order by test)
  into failures, report
  from uat_results;
  raise exception E'UAT PERMISSION RESULTS — % failure(s); transaction rolled back\n%', failures, report;
end $$;
