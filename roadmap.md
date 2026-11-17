# Pending upgrade-spec work

Source: user's 714-line upgrade spec ("Upgrade my existing Student Hub..."). Homepage, onboarding, AI Coach, AI Notes→Study system, AI quiz generation are done.

Remaining:

- [x] Data layer: courses table (store.ts + data.ts + cloud sync)
- [x] Migration: public.courses with RLS + grants, applied to cloud
- [x] Smart GPA Center (/gpa): courses, credits, grades, GPA + target GPA, "what do I need on my final"
- [x] Course pages (/courses): create courses, linked assignments/exams/notes, AI actions
- [x] AI Syllabus Scanner (/syllabus): paste/PDF/image → courses, assignments, exams, dates → planner
- [x] Study Mode (/study-mode): calm focus screen, presets + custom timer, session logging
- [x] Group Study Room (/study-room): Jitsi video/audio, room links/codes, screen sharing, live chat
- [x] Dashboard = Semester Dashboard: Deadline Protection card, upcoming, week, GPA, coach
- [x] Progress = Study Analytics: focus sessions, most productive day, consistency, tasks/day chart
- [x] Navigation updated (sidebar + mobile)
- [x] Typecheck, build, browser smoke test

## Student Hub 2.0

- [ ] Inspect existing authentication, data, route, and UI patterns for the requested features
- [ ] Build authenticated YouTube Study Player with persisted lectures, notes, timestamps, and progress
- [ ] Build secure public sharing for flashcard decks and notes, including import and Shared With Me
- [ ] Add admin-manageable playlist records and real-data growth analytics
- [ ] Add database schema, grants, RLS, and authenticated server-side sharing operations
- [ ] Test player, sharing, import/revoke, authorization, and responsive flows; verify diagnostics

## International and offline foundation

- [x] Add account settings for language, country/grading preference, regional formats, and accessibility
- [x] Add English, Urdu, Spanish, French, German, and Arabic interface strings with RTL direction
- [x] Add installable PWA manifest, static app-shell caching, and per-user offline data cache
- [x] Add user-scoped JSON/CSV export and server-side password-confirmed account deletion
- [ ] Apply the user-preferences migration to each deployed Supabase environment
- [ ] Add institution-specific custom grading scales and DST-safe timezone conversion for planner events
- [x] Add server-side Google Calendar and Outlook OAuth sync with encrypted tokens and manual event sync; provider credentials and live-account verification are still required
- [x] Implement study groups, role-based membership, study sessions, tutoring, progress sharing, and shared-material imports
- [ ] Apply and test the community migration against a Supabase test project, including cross-user access denial and revocation

## Student productivity expansion

- [x] Add SM-2-style spaced review scheduling and due-card dashboard entry points
- [x] Add weighted assignment rubrics and exam revision roadmaps
- [x] Add source organizer with metadata-based APA/MLA citation formatting
- [x] Add scholarship/university application tracker and private budget planner
- [x] Add owner-scoped tables, RLS, cloud sync, and JSON/CSV export coverage
- [ ] Apply `supabase/migrations/20261120120000_student_toolkit.sql` to deployed Supabase projects
- [x] Implement Google Classroom OAuth and paginated course/assignment import; provider credentials and live-account verification are still required
- [x] Implement Canvas OAuth and paginated course/assignment import with exact host allowlisting; institution credentials and live-account verification are still required
- [x] Implement configurable Moodle OAuth and course/assignment import adapter; each instance's endpoints/response format must be configured and verified

## Community rollout

- [x] Add server-authorized study groups, expiring invitations, role management, and group study sessions
- [x] Add opt-in peer tutoring listings and private tutoring requests
- [x] Add revocable, email-bound progress sharing and group-shared note/flashcard snapshots
- [x] Include authorized community records in account JSON/CSV export
- [ ] Apply `supabase/migrations/20261116130000_community.sql` to a test and production Supabase project
- [ ] Test RLS/RPC access boundaries, invite expiry/revocation, member removal, share revocation, and idempotent imports
- [x] Implement server-side OAuth, encrypted token storage, refresh handling, protected integration storage, and real LMS imports/calendar sync; provider-side grant revocation and live-provider verification remain deployment tasks

## Local study toolkit

- [x] Add a local Concept Challenger, exam cram sheet, and sleep-aware study planner
- [x] Analyze saved quiz mistakes and retain explicitly labeled browser-only attempts when the quiz-history service is unavailable
- [x] Add an informational parent progress snapshot encrypted in the share URL fragment with a client-side 30-day expiry; it is unverified, alterable, and non-revocable, so authoritative reports require a future server-side service
- [x] Add all five tools to authenticated navigation and dashboard entry points

## Practice, wellness, and peer exchange

- [x] Add browser-based handwriting OCR with editable, locally saved study notes
- [x] Add a breathing reset, confidence check, local mock viva, and voluntary tab-aware focus lock
- [x] Add local-only note/bounty fallback plus server-validated coin escrow and peer marketplace RPCs
- [ ] Apply `supabase/migrations/20261122100000_peer_note_marketplace.sql` and validate authorization, duplicate note rewards, bounty escrow, and answer payout against Supabase
- [ ] Verify handwriting OCR with representative handwriting; OCR requires the public Tesseract worker/language model on first use
