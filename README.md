# Career Insight

A mobile-first career discovery platform for Grade 8–12 South African learners and their parents: admin-published opportunities with downloadable application forms, a community feed, live sessions with recordings, notifications and analytics. Roles: Student, Parent, Contributor, Tutor (an approved contributor type) and Admin.

Behaviour is specified by the client's UAT plan; [docs/UAT-traceability.md](docs/UAT-traceability.md) maps every UAT test to the feature and the database rule that enforces it.

## Roles at a glance

| Role | Mobile tabs | Can | Can't |
| --- | --- | --- | --- |
| Student / Parent | Home · Explore · Post · Live · Profile | Browse/search, download forms (Saved Downloads), post, comment, like, report, watch live and recordings | Manage opportunities, host live, categorise posts |
| Contributor | Home · Post · Live · Analytics · Profile | After admin approval: categorise posts, host live, see own analytics | Create opportunities, see others' analytics |
| Tutor | Same as contributor | As contributor; hosts live only when an admin allows it | Admin permissions |
| Admin | Same as contributor + web console | Everything: opportunities, users & roles, moderation, live, analytics, audit log | — |

## Apps

| Folder | Who uses it | Stack |
| --- | --- | --- |
| `mobile/` | Students, parents, contributors | Expo SDK 58 (Expo Router, React Native, TypeScript) |
| `web/` | Admins only — non-admin profiles get an "Admins only" screen | React + Vite + Tailwind + shadcn/ui (Radix) |
| `supabase/` | Shared backend for both | Postgres + Auth + Storage + Realtime + Edge Functions |

Claude (Anthropic API) powers Career Compass via a server-side edge function.

## Local setup

Admin web app:

```bash
cd web
npm install
cp .env.example .env.local   # Supabase project URL + anon key
npm run dev
```

Mobile app:

```bash
cd mobile
npm install
cp .env.example .env.local   # same Supabase project URL + publishable/anon key
npx expo start               # scan the QR code with Expo Go, or press a / i / w
```

The first admin is created by signing up in the mobile app and then setting `role = 'admin'` on that `user_profiles` row from the Supabase SQL editor (or `supabase db query --linked`). After that, admins promote others in the web console under **Users & roles**. Users can never grant themselves admin, change their own role, or approve themselves — the database blocks it.

Permission checks for the UAT (they run in a transaction and roll back, so nothing is left behind):

```bash
supabase db query --linked -f supabase/tests/uat_permissions.sql
```

## Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project Settings → API → Project URL / anon public key** into `web/.env.local` and `mobile/.env.local`.
3. Run the migrations from the repo root — either:
   - `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - paste each file in `supabase/migrations/` into the SQL editor, in order, and run it. `0002` locks admin roles and adds `record_form_download()`, which the mobile app needs for form downloads. `0003` adds download analytics for the Admin overview. `0004` aligns everything with the UAT plan: private profiles + public `profile_cards`, admin-only opportunity lifecycle, download/view events, post/comment/live guards, reports, notifications, the audit log and storage limits.
4. **Google OAuth**: enable the Google provider under **Authentication → Providers** and add your OAuth client ID/secret (Supabase dashboard only — not scriptable from this repo).
5. **Email OTP for registration**: under **Authentication → Email Templates**, switch the "Confirm signup" template to the OTP variant so `supabase.auth.verifyOtp({ type: 'signup' })` works as wired up in `mobile/src/app/(auth)/sign-up.tsx`.
6. **Career Compass edge function**:
   ```bash
   npx supabase functions deploy career-chatbot
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
7. **Transactional email (Resend)**: create a free account at [resend.com](https://resend.com), grab an API key, then:
   ```bash
   npx supabase functions deploy send-email
   npx supabase secrets set RESEND_API_KEY=re_...
   npx supabase secrets set EMAIL_FROM="Career Insight <onboarding@resend.dev>"   # or your verified sending domain
   ```

   > On Windows, `npx supabase` may fail to resolve a CLI binary. Install it via [Scoop](https://scoop.sh) instead: `scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase`, then use `supabase` in place of `npx supabase` above.

## What's built

**Mobile (`mobile/`)** — sign-up with email code, onboarding (Student, Parent, Contributor, Tutor), role-based tabs, Home (opportunity and people rows + community feed with For you / Following), Explore (opportunity search and filters, People search), Post (text + image, categories for approved contributors), post detail (likes, comments, report, edit/delete own), Live (live now / upcoming / recordings / downloaded; hosts schedule, start, end and attach recordings; offline playback), Analytics (own content for contributors, platform totals for admins), Profile (Saved Downloads with on-device forms, post history, edit profile), public profiles with follow, notifications centre, offline banner.

**Admin web (`web/`)** — Overview, Opportunities (create/edit with cover image and form upload, draft → publish → archive, CSV export, per-opportunity engagement), Content moderation (reports, restore/remove, recategorise), Users & roles (roles, contributor/tutor approval, live hosting), Live sessions, Analytics (date ranges, views vs download events vs unique downloaders, CSV), Audit log. Careers and Polls pages from the original app remain.

**Not in this release** (see the traceability doc): push notifications, in-app broadcasting through a streaming provider, private/restricted sessions, Google sign-in and password reset on mobile, the AI career guide, CV builder and career pages on mobile.

## Project structure

Mobile (`mobile/src/`):

- `app/` — Expo Router routes. `(tabs)/` holds Home, Explore, Post, Live, Analytics and Profile (hidden per role in `(tabs)/_layout.tsx`); stack screens for `opportunity/`, `post/`, `live/`, `profile/` and `notifications`. The root `_layout.tsx` guards routes by signed-in / onboarded state and wires React Query to network status.
- `services/` — Supabase queries per area; `lib/device-files.ts` — forms and recordings saved on the device; `hooks/` — auth, role permissions (`use-role.ts`), likes, follows, saved items, form downloads
- `components/` — `ui/` primitives plus feature components (posts, live, opportunities, profiles)

Admin web (`web/src/`):

- `lib/adminData.js` — every admin query and mutation; `lib/` also has the Supabase client, auth wrapper and integrations (uploads, email)
- `components/admin/` — shared admin UI (`AdminUi.jsx`), `OpportunityEditor.jsx`; `components/layout/` — sidebar, top bar, admin gate
- `pages/` — one file per route (`Admin*.jsx` for the console)

Backend:

- `supabase/migrations/` — schema, RLS, functions, triggers and storage buckets (0001–0004)
- `supabase/tests/uat_permissions.sql` — role-permission checks for UAT
- `supabase/functions/` — `career-chatbot` (Claude) and `send-email` (Resend) edge functions
