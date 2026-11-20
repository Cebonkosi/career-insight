# Career Insight

A career ecosystem for Grade 8–12 South African students: career discovery, roadmaps, opportunities (scholarships/bursaries/internships) with downloadable application forms, a social feed, live streams, and an AI career guidance chatbot ("Career Compass"). Four roles: Student, Parent, Contributor, Admin.

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

Admins are not created through either app: create the account, then set `role = 'admin'` on its `user_profiles` row from the Supabase SQL editor. Migration `0002` blocks users from granting themselves admin.

## Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Copy **Project Settings → API → Project URL / anon public key** into `web/.env.local` and `mobile/.env.local`.
3. Run the migrations from the repo root — either:
   - `npx supabase link --project-ref <ref>` then `npx supabase db push`, or
   - paste each file in `supabase/migrations/` into the SQL editor, in order, and run it. `0002` locks admin roles and adds `record_form_download()`, which the mobile app needs for form downloads. `0003` adds the `rejected` status and review fields the admin Opportunity review page writes, plus the download analytics the Admin overview reads.
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

## What's wired up vs. still minimal

**Mobile (`mobile/`)**: email sign-up with OTP verification, sign-in, onboarding (student / parent / contributor profile), the opportunity feed (search, type filter, infinite scroll), opportunity detail (download application form, apply link, save), "My forms" (downloaded forms with deadline countdowns), and profile/sign-out. Not yet on mobile: careers, social feed, live streams, polls, notifications, Career Compass, Google sign-in, password reset.

**Admin web (`web/`)** — paths below are relative to `web/`. Auth, onboarding, the Supabase schema/RLS, and the entity/integrations layer are fully wired. Feature pages (feed, opportunities, live, admin, contributor hub, etc.) render real data. Feed and opportunities lists page through results via infinite scroll (`src/hooks/useInfiniteScrollTrigger.js`); posts have threaded comments (one level of replies, soft-delete for the author/admin) via `src/components/feed/CommentThread.jsx`; and `SendEmail` sends real mail through a Resend-backed edge function (`supabase/functions/send-email/`), wired into contributor verification and opportunity approval/rejection in the admin panel.

Still minimal: likes aren't wired to a click handler yet (counts render but don't update), `follows_count`/`following_count` aren't incremented on follow/unfollow, and other list pages (careers, live, admin queues, notifications, saved items) still fetch a single page rather than paginating.

## Project structure

Mobile (`mobile/src/`):

- `app/` — Expo Router routes: `(auth)/` sign-in & sign-up, `onboarding.tsx`, `(tabs)/` (opportunities, my forms, profile), `opportunity/[id].tsx`. The root `_layout.tsx` uses `Stack.Protected` guards to route by signed-in / onboarded state.
- `services/` — Supabase queries; `hooks/use-auth.tsx` — session + profile context; `lib/supabase.ts` — client
- `components/` — `ui/` primitives (button, text field, chip/badge) plus feature components

Admin web (`web/src/`; the student pages under `pages/` are no longer routed and can be deleted or moved to mobile):

- `src/lib/` — Supabase client, generic entity CRUD/subscribe layer (`entities.js`), auth wrapper (`auth.js`), integrations (`integrations.js`: file uploads, the LLM chatbot call, transactional email)
- `src/hooks/` — `useAuth` (session + profile context), `useUserProfile`, `useInfiniteScrollTrigger`
- `src/components/` — `ui/` (shadcn primitives) plus feature folders (`feed/` incl. `CommentThread`, `careers/`, `opportunities/`, `live/`, `profile/`, `chatbot/`, `admin/`, `contributor/`, `layout/`, `common/`)
- `src/pages/` — one file per route
- `supabase/migrations/` — schema + RLS + storage buckets
- `supabase/functions/career-chatbot/` — the Claude-powered chatbot edge function
- `supabase/functions/send-email/` — the Resend-backed transactional email edge function
