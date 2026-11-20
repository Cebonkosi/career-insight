# Career Insight — UAT traceability (UAT plan v1.0, 19 Nov 2026)

Maps every test in the UAT plan to where it is implemented, how it is enforced, and anything testers should
know. "DB" means the rule is enforced by Postgres (row-level security, triggers or security-definer
functions in `supabase/migrations/`), so it holds even if someone calls the API directly (AUTH-009).

Run the automated permission checks at any time (they roll back and leave no data):

```bash
supabase db query --linked -f supabase/tests/uat_permissions.sql
```

## Suggested Section 2.3 release status

| Feature area | Suggested status | Notes |
| --- | --- | --- |
| Student and Parent accounts | Available | Mobile sign-up → onboarding. |
| Contributor and Tutor accounts | Available | Self-register, then an admin approves in **Users & roles**. Tutors host live only when granted. |
| Admin mobile access | Available (limited) | Admins can use the mobile app (Home, Post, Live, Analytics). Opportunity management is web-only. |
| Admin web portal | Available | `web/` — admins only. |
| Opportunities and form downloads | Available | |
| Saved Downloads | Available | Profile → Saved Downloads (students/parents). App record + file saved on the device. |
| Posts and moderation | Available | |
| Search | Available | Opportunities (Explore) and contributors/tutors (Explore → People). |
| Live streaming | Available (link-based) | Hosts schedule sessions with an external stream link (YouTube Live, Zoom, Meet…). In-app broadcasting via a streaming provider is **Deferred** (risk R-02). |
| Recordings and offline playback | Available | MP4/MOV upload (≤ 50 MB on the current Supabase plan) or link. Uploaded MP4s can be downloaded and played offline; external links open in the browser only. |
| Notifications | Available (in-app) | Bell → notification centre. **Push notifications Deferred** (needs an EAS development build). |
| Admin analytics | Available | Web → Analytics; mobile → Analytics for admins. |
| Contributor analytics | Available | Mobile → Analytics, own content only. |

## Rules the business should sign off (risks R-05, R-06)

- **Download counting (ANL-003):** a *download event* is recorded each time a form finishes saving on a device. *Unique downloaders* counts each learner once. Both are shown separately everywhere. Views (detail-page opens) are counted separately.
- **Failed downloads (ANL-002, DL-004):** never recorded. The app records the event only after the file is saved.
- **Download ≠ submission (DL-010, R-05):** wording across the app and admin console states that a download is not evidence of an application.
- **Saved Downloads (R-06):** one row per learner per opportunity (with "downloaded N times"); the file is saved in the app's document folder on the device and can be reopened offline. Removing it from Saved Downloads keeps the file; signing out keeps files on the device.
- **Archiving (OPP-007):** archived opportunities disappear for learners; download history and Saved Downloads rows are kept.
- **Reported posts (POST-011):** a report hides the post from feeds immediately until an admin restores or removes it.

## 10.1 Authentication, registration and role access

| ID | Where | Enforcement / notes |
| --- | --- | --- |
| AUTH-001 | Mobile sign-up → onboarding "Student" | Grade required; profile created with role `student`. |
| AUTH-002 | Onboarding "Parent" | |
| AUTH-003 | Onboarding "Contributor"; admin approves in Users & roles | Until approved: no categories, hosting or analytics (DB: `is_verified_contributor()`, `can_host_live()`). |
| AUTH-004 | Onboarding "Tutor" (contributor + type `tutor`) | Never Admin; hosting only after "Allow hosting" (DB `can_host_live`). Covered by test script. |
| AUTH-005 | Web console; Users & roles → role Admin | Admin role can't be self-assigned (DB guard). |
| AUTH-006 | Sign-in | Supabase returns a generic "Invalid login credentials". |
| AUTH-007 | Profile → Sign out (mobile), sidebar sign-out (web) | Session cleared; protected routes redirect to sign-in. |
| AUTH-008 | Role-based tab bars; DB guard on `user_profiles` | Users can't change role, contributor type, verification, hosting or follower counts (test script). |
| AUTH-009 | DB policies on every table/function | Test script calls admin analytics/opportunity writes as a student. Web console also shows "Admins only" to non-admins. |

## 10.2 Home, navigation and search

| ID | Where | Notes |
| --- | --- | --- |
| NAV-001 | Student tabs: Home · Explore · **Post** · Live · Profile; bell + avatar in header | |
| NAV-002 | Parent: same as student | No contributor/admin controls. |
| NAV-003 | Contributor/Tutor/Admin tabs: Home · Post · Live · Analytics · Profile | No Saved Downloads for contributors. |
| NAV-004 | Explore → Opportunities search | Opens the correct detail page. |
| NAV-005 | Explore → People | Searches contributor and tutor public profile cards. |
| NAV-006 | Both searches | Clear empty states. |
| NAV-007 | Home: horizontal opportunity cards (cover images) and "People to follow" | |
| NAV-008 | All screens | Test on small phones; content max-width on tablets. |

## 10.3 Opportunities and application forms — Admin (web → Opportunities)

| ID | Notes |
| --- | --- |
| OPP-001 | New opportunity → required fields validated inline; Save draft or Publish. |
| OPP-002 | Cover image upload (JPG/PNG/WebP ≤ 5 MB) with preview; shown on mobile cards and detail. |
| OPP-003 | Application form upload (PDF/DOC/DOCX ≤ 10 MB). |
| OPP-004 | Drafts are admin-only (DB policy `published opportunities are readable`). Publishing notifies students and parents. |
| OPP-005 | Edit → saved and reflected on mobile (React Query refreshes on app focus / pull to refresh). |
| OPP-006 | Replace form → new file path every upload, so no stale cached file; re-downloads replace the device copy. |
| OPP-007 | Archive (confirm) → hidden from learners; events and Saved Downloads kept. Restore re-publishes. |
| OPP-008 | Client checks + storage bucket type/size limits (DB) reject bad files; missing required fields block publish. |
| OPP-009 | No "New opportunity" anywhere in the mobile app; DB rejects inserts/updates from non-admins (test script). |
| OPP-010 | Mobile Home row + Explore cards → detail with title, organisation, description, criteria, closing date and download action. |

## 10.4 Student/Parent discovery and downloads

| ID | Notes |
| --- | --- |
| DL-001/002 | Explore and Home for both roles. |
| DL-003 | "Download application form" saves the file, then offers "Open form" (share sheet / viewer). |
| DL-004 | No form → explanation instead of a button; failed download shows an error and records nothing. |
| DL-005 | Profile → Saved Downloads shows the item with organisation, dates and count. |
| DL-006 | Saved Downloads → "Open form" (on-device copy, works offline) or "Download again". |
| DL-007 | No draft, submit or notes controls exist on Saved Downloads. |
| DL-008 | Files saved to the app's document directory; opened via the system share sheet so users can save to Files/Drive or open in a PDF viewer. **Must be tested on real Android and iOS devices.** Web opens the file in a new tab instead. |
| DL-009 | "How to apply" section with the admin's instructions and an https-only provider link. |
| DL-010 | Wording on detail, Saved Downloads, analytics and admin; nothing is labelled "applied/submitted". |

## 10.5 Download analytics

| ID | Notes |
| --- | --- |
| ANL-001 | Web Analytics / Opportunities detail; overview chart. Updates immediately (no aggregation delay). |
| ANL-002 | Failed downloads are never written (event is recorded after the file is saved). |
| ANL-003 | Download events vs unique downloaders shown side by side (test script checks two downloads → one Saved Download, two events). |
| ANL-004 | Web Analytics: 7/30/90 days or custom range; mobile Analytics: 7/30/90 days. |
| ANL-005 | `contributor_analytics()` returns only the caller's posts, sessions and opportunities an admin linked to them (test script). |
| ANL-006 | Totals come straight from `opportunity_events`; compare with `select count(*) from opportunity_events` for the same range. |

## 10.6 Posts, profiles and moderation

| ID | Notes |
| --- | --- |
| POST-001/002 | Post tab → text and optional image. |
| POST-003 | Approved contributors see category chips. |
| POST-004 | Admins categorise in the app or web → Content moderation → All posts. |
| POST-005 | No category selector for students/parents; DB clears any category they send (test script). |
| POST-006 | Post → Edit (own posts only). |
| POST-007 | Post → Delete with confirmation. |
| POST-008 | DB: authors only (test script). Others don't see edit/delete. |
| POST-009 | Profile → My posts (newest first, "Load more"); public profiles show the same history. |
| POST-010 | Like (one per user, DB unique) and comments; counts maintained by the DB. |
| POST-011 | Report with a reason → hidden pending review → admin Restore/Remove. |
| POST-012 | Images only (JPG/PNG/WebP ≤ 5 MB); rejected with a clear message on device and by the storage bucket. |

## 10.7 Live streaming and recordings

| ID | Notes |
| --- | --- |
| LIVE-001 | Web → Live sessions, or mobile Live → Schedule a session (admin). |
| LIVE-002 | Approved contributors (and tutors granted hosting) schedule/start/end in the app. |
| LIVE-003/004 | No host controls for students/parents; DB rejects inserts (test script). |
| LIVE-005 | Live session page → "Join live session" opens the host's stream link; viewer counted. |
| LIVE-006 | Host ends session → uploads a recording or pastes a link; learners notified. |
| LIVE-007 | "Download for offline viewing" (uploaded MP4/MOV recordings). |
| LIVE-008 | Live → Downloaded plays the device copy with no connection. **Test on device in airplane mode.** |
| LIVE-009 | Player error state with Retry; offline banner; join errors explained. |
| LIVE-010 | **Not applicable** — all sessions are open to signed-in users in this release. |

## 10.8 Notifications

| ID | Notes |
| --- | --- |
| NOT-001 | In-app notification created by the DB when an opportunity is published, a session is scheduled/starts/gets a recording, someone comments on/likes your post or follows you, or your contributor account is approved. |
| NOT-002 | Tapping opens the linked screen (only in-app paths are followed). |
| NOT-003 | Opportunity/live notices go to students and parents only; engagement notices only to the post author. Users can't create notifications (test script). |
| NOT-004 | Push is deferred, so device permission doesn't affect the in-app centre. Re-test when push is added. |

## 10.9 Admin portal

| ID | Notes |
| --- | --- |
| ADM-001 | Web sign-in; non-admins see "Admins only". |
| ADM-002 | Overview stat cards and chart from live data. |
| ADM-003 | Users & roles: change role (confirm), approve/withdraw contributors, allow/remove tutor hosting. |
| ADM-004 | Content moderation: restore/remove/recategorise. |
| ADM-005 | Mobile refetches on focus and pull-to-refresh. |
| ADM-006 | Audit log page; written by DB triggers, not editable. |

## 10.10 Privacy, security, reliability, usability

| ID | Notes |
| --- | --- |
| NFR-001 | Full profiles (email, phone, school) visible only to the owner and admins; everyone else reads `profile_cards` (test script). |
| NFR-002 | **Not applicable** — application forms are intentionally public documents. Completed forms never touch Career Insight. |
| NFR-003 | Supabase sessions refresh while the app is open; expired sessions return to sign-in. |
| NFR-004 | Length limits on posts (2,000), comments (500), bios (300), titles; URL validation; DB checks on report reasons. |
| NFR-005 | Offline banner; queries pause offline and refetch on reconnect; retry buttons on errors. |
| NFR-006 | Session persists (SQLite storage); saved forms and recordings survive restarts. |
| NFR-007 | Loading, empty and error states on every list. |
| NFR-008 | Accessibility labels on icon buttons; 44px+ touch targets on primary controls. Review contrast on real devices. |
| NFR-009 | Notification text is generic (no personal or application details). |
| NFR-010 | Run the core journey on Android and iOS devices. |

## 11. End-to-end journeys

| Journey | How to run |
| --- | --- |
| E2E-001 | Web: New opportunity with cover + PDF → Publish. Mobile (student): Home/Explore → open → Download → Profile → Saved Downloads. Web: Analytics shows 1 view, 1 download, 1 unique downloader. |
| E2E-002 | Web: approve the contributor. Mobile (contributor): Post with a category. Mobile (student): like + comment. Mobile (contributor): Analytics. |
| E2E-003 | Web or mobile (admin): schedule → Start → student joins → End → upload MP4 → student downloads → airplane mode → play. |
| E2E-004 | Mobile (student): post → edit → Profile → My posts → delete. |
| E2E-005 | `supabase/tests/uat_permissions.sql` + manual attempt from a student/contributor account (no controls shown; API refuses). |

## Test accounts (Section 9)

Create one account per role in the mobile app with synthetic details, then in the web console → Users & roles:
approve the contributor and tutor, allow hosting for the tutor, and set the admin account's role to Admin.
Use a separate Supabase project for UAT if real users are already on this one.
