# Study Smart Hub

Build a complete, production-ready student platform called "Student Hub".

IMPORTANT:

Do NOT create just a landing page or a visual mockup.

Build a fully functional web application with working navigation, authentication, dashboard, study tools, user profiles, and database-ready architecture.

The website should feel like a polished SaaS product designed specifically for students.

====================================

1. BRAND & DESIGN

====================================

Brand name:

Student Hub

Tagline:

"Everything You Need to Study Smarter."

Design style:

- Modern

- Polished

- Clean

- Student-focused

- Professional SaaS UI

- Responsive on desktop, tablet and mobile

- Smooth animations

- Rounded cards

- Clean typography

- Excellent spacing

- Modern dashboard

- Avoid excessive gradients

- Avoid clutter

- Make it feel like a real startup, not a template

Use a professional academic/productivity aesthetic.

Main navigation:

- Home

- Features

- Study Tools

- Free Features

- About

- Login

- Get Started

After login:

- Dashboard

- AI Study Assistant

- AI Notes

- Quiz Generator

- Study Planner

- Flashcards

- Pomodoro

- My Notes

- Progress

- Profile

- Logout

====================================

2. LANDING PAGE

====================================

Create a high-converting landing page.

Hero section:

Headline:

"Study Smarter. Achieve More."

Subheadline:

"Student Hub brings AI-powered study tools, notes, quizzes, planning and productivity into one simple platform."

Buttons:

"Start for Free"

"Explore Features"

Add a modern dashboard preview/mockup showing:

- Study progress

- Today's tasks

- AI assistant

- Upcoming exams

- Study streak

Do NOT make fake buttons that do nothing.

Every button should navigate to the appropriate page.

====================================

3. FEATURES SECTION

====================================

Create feature cards for:

AI Study Assistant

- Ask questions

- Get explanations

- Simplify difficult concepts

- Step-by-step learning

AI Notes

- Create notes

- Summarize content

- Organize notes

- Turn notes into study material

Quiz Generator

- Generate quizzes

- Multiple choice questions

- Difficulty levels

- Track scores

Study Planner

- Create study schedules

- Add subjects

- Add exams

- Daily tasks

- Track completion

Flashcards

- Create flashcards

- AI-generated flashcards

- Practice mode

Pomodoro Timer

- Focus sessions

- Break sessions

- Study tracking

Progress Tracking

- Study hours

- Completed tasks

- Quiz scores

- Study streak

====================================

4. AUTHENTICATION

====================================

Implement proper authentication.

Pages:

- Sign Up

- Login

- Forgot Password

- Reset Password

Signup fields:

- Name

- Email

- Password

- Confirm Password

After signup:

Redirect user to onboarding.

Onboarding:

1. What grade/year are you in?

2. What subjects do you study?

3. What are your study goals?

4. Do you have upcoming exams?

5. How many hours can you study per day?

Save these preferences to the user's profile.

====================================

5. STUDENT DASHBOARD

====================================

Create a beautiful authenticated dashboard.

Top:

"Welcome back, [Name] 👋"

Show:

Study Streak

Current streak: X days

Today's Progress

0%

Study Time

0 hours

Quiz Average

0%

Upcoming Exam

Exam name + countdown

Today's Tasks:

- Mathematics

- English

- Science

etc.

Quick Actions:

- Ask AI

- Create Notes

- Generate Quiz

- Plan Study Session

- Start Pomodoro

Dashboard data should update based on user actions.

====================================

6. AI STUDY ASSISTANT

====================================

Create a dedicated AI Study Assistant page.

Interface similar to a modern AI chat application.

Features:

- User asks a question

- AI responds

- Conversation history

- New conversation

- Clear conversation

- Copy answer

- Regenerate answer

Add modes:

Explain Simply

Step-by-Step

Exam Prep

Summarize

Quiz Me

IMPORTANT:

Do not pretend an AI API exists if it has not been connected.

Create the application architecture so an AI API can be securely connected later using environment variables/server-side functions.

Never expose API keys in frontend code.

====================================

7. AI NOTES

====================================

Create an AI Notes page.

User can:

- Write notes

- Paste text

- Upload supported documents/PDFs if backend storage is configured

- Generate summary

- Extract key points

- Generate flashcards

- Generate quiz questions

Allow users to save notes.

Create:

My Notes

Recent Notes

Favorites

Search Notes

====================================

8. QUIZ GENERATOR

====================================

Create a working quiz interface.

User selects:

- Subject

- Topic

- Difficulty

- Number of questions

Generate quiz structure.

Quiz screen:

Question

A

B

C

D

After submission:

- Score

- Correct answers

- Incorrect answers

- Explanation

- Retry Quiz

Save quiz history to the user's account.

If AI backend is not connected yet, use a clean mock/demo dataset rather than pretending the AI is live.

====================================

9. FLASHCARDS

====================================

Create flashcard functionality.

Users can:

- Create decks

- Add cards

- Edit cards

- Delete cards

- Study cards

- Mark Easy / Medium / Hard

Add AI Flashcard generation architecture.

====================================

10. STUDY PLANNER

====================================

Create a study planning system.

User can add:

- Subject

- Topic

- Task

- Date

- Time

- Priority

Calendar view:

- Today

- Week

- Month

Allow:

- Complete task

- Edit task

- Delete task

Show progress percentage.

====================================

11. POMODORO

====================================

Create a functional Pomodoro timer.

Default:

25 minutes focus

5 minutes break

Allow custom duration.

Buttons:

Start

Pause

Reset

Track completed sessions.

Save study session history.

====================================

12. FREE FEATURES

====================================

All Student Hub features are available to every registered user at no charge.
There are no paid plans, subscriptions, or feature paywalls.

AI features use an external service and a shared fair-use allowance. Do not
describe this provider usage as cost-free to Student Hub or promise unlimited
AI usage. Users are not charged through the app.

The AI gateway credential is `LOVABLE_API_KEY`. Set it only as a server-side
environment secret (for local development, in the uncommitted server `.env`);
never use a `VITE_` prefix or include the key in browser code. Without it, Ask
AI and AI Coach use clearly labeled local study guides. The Coach also falls
back to a dated plan built from saved tasks, exams, priorities, and the daily
study target when the AI request fails, and offers a retry. The Mock Viva uses
the same server-side AI gateway for optional feedback and falls back to local
structure-only feedback if AI is unavailable. AI feedback sends the supplied
answer to the configured provider through the server.

The browser cache keeps study data locally when a known Supabase application
table is not installed; synchronization resumes after the table is available
and data is refreshed. This is not a replacement for applying the migrations
before production use.

====================================

14. USER PROFILE

====================================

Profile page:

Name

Email

Grade

Subjects

Study goals

Profile picture

Settings:

- Update profile

- Change password

- Notification settings

- Delete account

====================================

15. PROGRESS ANALYTICS

====================================

Create a Progress page.

Show:

- Total study hours

- Weekly study hours

- Quiz scores

- Tasks completed

- Current streak

- Best streak

- Subject performance

Use clean charts.

Do not use fake statistics for real users.

Show empty states when there is no data.

====================================

16. DATABASE STRUCTURE

====================================

Design database tables/collections for:

users

profiles

notes

quizzes

quiz_attempts

flashcard_decks

flashcards

study_tasks

study_sessions

ai_conversations

ai_messages

user_settings

Each user's private data must only be accessible by that authenticated user.

Implement proper authorization/security rules.

Legacy subscription records, if present, are retained for data preservation and
must not be used to grant or restrict feature access.

====================================

17. SEARCH

====================================

Add global search for:

- Notes

- Flashcards

- Quizzes

- Tasks

Search should return relevant user-owned content.

====================================

18. NOTIFICATIONS

====================================

Create notification system for:

- Upcoming study task

- Upcoming exam

- Study streak

- Important account notifications

Allow users to enable/disable notifications.

====================================

19. RESPONSIVE DESIGN

====================================

Desktop:

Professional sidebar dashboard.

Mobile:

Bottom navigation or mobile sidebar.

Everything must work properly on:

- Desktop

- Tablet

- Mobile

No horizontal scrolling.

====================================

20. ERROR & EMPTY STATES

====================================

Create proper states for:

Loading

No notes

No quizzes

No tasks

No flashcards

No study history

Payment error

Authentication error

AI unavailable

Network error

Use helpful messages and buttons.

Example:

"No study activity yet.

Complete your first study session to start building your progress."

====================================

21. SECURITY

====================================

Security is extremely important.

- Never expose API keys

- Validate user input

- Protect authenticated routes

- Users can only access their own private data

- Use secure server-side operations for sensitive actions

- Do not store plaintext passwords

- Use proper authentication provider

- Add authorization checks

====================================

22. PERFORMANCE

====================================

Optimize for fast loading.

- Lazy load heavy components

- Optimize images

- Avoid unnecessary animations

- Avoid unnecessary database requests

- Keep dashboard responsive

- Use reusable components

====================================

23. FINAL QUALITY REQUIREMENT

====================================

Before considering the project complete, test every navigation link and major interaction.

Check:

✓ Signup

✓ Login

✓ Logout

✓ Dashboard

✓ AI Assistant

✓ Notes

✓ Quiz Generator

✓ Flashcards

✓ Study Planner

✓ Pomodoro

✓ Progress

✓ Profile

✓ Free features information

✓ No subscription or feature paywalls

✓ Mobile navigation

✓ Responsive layout

✓ Error states

✓ Empty states

Do not leave placeholder buttons that do nothing.

If a feature requires an external API that has not been configured, clearly
indicate what configuration/environment variable is required.

The final result should look and feel like a polished SaaS product that could eventually be launched publicly.

Prioritize FUNCTIONALITY over decorative visuals.

This project was built with [Lovable](https://lovable.dev).

## Settings, offline access, and account privacy

The authenticated `/settings` page stores language, country/grading, time-zone,
date/time, week-start, and accessibility preferences in `user_settings`.
English is the default; the interface currently includes English, Urdu,
Spanish, French, German, and Arabic. User-created notes and other content are
not translated.

The app manifest and service worker cache the public app shell and static
assets only. Previously loaded account data is stored in IndexedDB under the
authenticated user ID and cleared on sign-out. Offline edits are queued; if
the server copy changed since it was loaded, synchronization is stopped and
the app asks the user to reload rather than overwrite newer data. Device
storage is browser-managed and is not encrypted by the app.
When a signed-in tab regains focus, Student Hub refreshes cloud data if that
tab has no pending local edits; concurrent local edits are preserved and synced
through the existing conflict check.

JSON and CSV exports are generated in the browser from the signed-in user's
data. Account deletion re-authenticates with the current password and uses
Supabase Admin Auth server-side; configure `SUPABASE_SERVICE_ROLE_KEY` only
in the server environment (never as a `VITE_` variable). If that server secret
is missing, deletion fails explicitly and no success is reported. Apply
`supabase/migrations/20261116120000_user_preferences.sql` before deploying
these settings to an existing Supabase project.

The configured grading conversions are generic planning estimates, not
institution-certified conversions. Calendar sync converts planner wall times
using the saved IANA time zone and handles daylight-saving transitions; it
does not change planner data when the time-zone preference changes.

## Community and learning integrations

The authenticated `/community` page provides study groups, expiring and
revocable group invitation tokens, membership roles, group study sessions,
opt-in tutoring listings and private tutoring requests, email-bound progress
sharing, and group-shared note/flashcard snapshots. Shared material is copied
into the group; edits do not change the original. Imported materials are
independent copies and remain with the importer if the original share is later
revoked. Progress sharing exposes only the displayed progress summary, and an
invitation must be delivered to the specified email recipient separately.

Community records use server-authorized database functions and are
intentionally excluded from the broad browser-cache synchronization. Apply
`supabase/migrations/20261116130000_community.sql` to each Supabase project
before using the community page. The migration has not been applied or
permission-tested against a live Supabase project as part of this change;
verify cross-account access denial, invitation expiry/revocation, member
removal, share revocation, and duplicate imports in a test project before
production rollout.

If the community snapshot RPC is unavailable because that migration is missing,
the page displays a clearly labeled temporary local sample feed instead.
Community actions are not saved or shared in that mode.

The Settings page now offers optional server-side OAuth connections for Google
Classroom, Canvas, Moodle, Google Calendar, and Outlook Calendar. LMS imports
are manual and import courses plus assignment due dates without overwriting
existing Student Hub records. Calendar sync is manual, supports task, exam,
and completed study-session selections, and updates/deletes only events in its
private Student Hub mapping. Disconnect removes Student Hub's stored tokens;
it does not delete already-synced calendar events or revoke the provider grant.
For full revocation, remove Student Hub from the connected-apps/security page
for that provider. Automatic/background synchronization is not implemented.

## Group Study Room

The authenticated `/study-room` page lets students create a room or join with a
32-character random room code. It uses the public Jitsi Meet iframe API
(`meet.jit.si`) for live video/audio and screen sharing, with a live side chat
for messages and study notes. Invite links can be copied or opened in an email
client. Room codes and chat are held only in the browser and are not saved to
Student Hub's database.

No Jitsi API key or separate paid account is configured by Student Hub. The
feature does require an internet connection and the public Jitsi service; its
availability, service policies, and any access requirements are controlled by
Jitsi and may change. Anyone with a room link can join, so share it privately
and do not discuss sensitive information. Participants need to grant browser
camera and microphone permissions; screen sharing depends on browser/device
support.

### Provider setup (server only)

Apply `supabase/migrations/20261117140000_provider_integrations.sql` to each
Supabase environment first. The credential and OAuth-state tables have RLS
enabled and deny `anon`/`authenticated` table access; only server-side
`service_role` operations should use them. Do not include these tables in
browser-cache synchronization. The migration and RLS still need verification
against the deployment's own Supabase project before production use.

Configure these variables only in the private server environment. Never use
`VITE_` prefixes, commit real values, or share secrets in chat. Existing
Supabase server variables are also required: `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.

| Variable                                                     | Purpose                                                                                                                                   |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `INTEGRATION_TOKEN_ENCRYPTION_KEY`                           | Required 32-byte AES-GCM key, encoded as 64 hex characters or Base64; generate a strong random key and keep it stable across deploys.     |
| `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`       | Google OAuth web application client shared by the separate Classroom and Calendar grants.                                                 |
| `GOOGLE_CLASSROOM_REDIRECT_URI`                              | Exact deployed callback URL ending in `/integrations/callback` for Classroom.                                                             |
| `GOOGLE_CALENDAR_REDIRECT_URI`                               | Exact deployed callback URL ending in `/integrations/callback` for Calendar.                                                              |
| `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` | Microsoft Entra application credentials.                                                                                                  |
| `MICROSOFT_OAUTH_TENANT_ID`                                  | Optional tenant ID; defaults to `common`.                                                                                                 |
| `MICROSOFT_CALENDAR_REDIRECT_URI`                            | Exact deployed callback URL ending in `/integrations/callback`.                                                                           |
| `CANVAS_CLIENT_ID`, `CANVAS_CLIENT_SECRET`                   | Institution-provisioned Canvas developer key.                                                                                             |
| `CANVAS_REDIRECT_URI`                                        | Exact deployed callback URL ending in `/integrations/callback`.                                                                           |
| `CANVAS_ALLOWED_HOSTS`                                       | Comma-separated exact institution hostnames (no wildcard or URL path).                                                                    |
| `MOODLE_CLIENT_ID`, `MOODLE_CLIENT_SECRET`                   | Institution-specific Moodle OAuth client credentials.                                                                                     |
| `MOODLE_REDIRECT_URI`                                        | Exact deployed callback URL ending in `/integrations/callback`.                                                                           |
| `MOODLE_ALLOWED_HOSTS`                                       | Comma-separated exact Moodle hostnames.                                                                                                   |
| `MOODLE_AUTHORIZATION_URL`, `MOODLE_TOKEN_URL`               | Institution-specific OAuth endpoints; both must use the allowlisted instance origin.                                                      |
| `MOODLE_OAUTH_SCOPES`                                        | Space-separated scopes configured by the Moodle administrator.                                                                            |
| `MOODLE_COURSES_API_URL`                                     | Same-origin endpoint returning a JSON array with course `id` and `name` (optional `teacher`).                                             |
| `MOODLE_ASSIGNMENTS_API_URL`                                 | Same-origin endpoint template containing `{courseId}` and returning a JSON array with assignment `id`, `name`, and `duedate` or `due_at`. |

Generate `INTEGRATION_TOKEN_ENCRYPTION_KEY` with a secure random generator, for
example `openssl rand -hex 32`. Store it in the server's secret manager and
keep the same key across deployments.

#### Google Classroom

1. In Google Cloud Console, enable the Google Classroom API and configure the
   OAuth consent screen and a Web application OAuth client.
2. Register the exact `GOOGLE_CLASSROOM_REDIRECT_URI` as an authorized
   redirect URI. The app requests
   `https://www.googleapis.com/auth/classroom.courses.readonly` and
   `https://www.googleapis.com/auth/classroom.coursework.me.readonly` for the
   signed-in student's courses and coursework. Google may require consent-screen
   verification for external users.
3. Configure the shared Google client ID/secret and this callback URI on the
   Student Hub server.

#### Google Calendar

Enable the Google Calendar API, register `GOOGLE_CALENDAR_REDIRECT_URI` on the
same OAuth client, and configure the Google Calendar environment variables.
The app requests `https://www.googleapis.com/auth/calendar.events.owned`, which
permits event access on calendars owned by the user. Users choose event types
and initiate sync from Settings.

#### Microsoft Outlook Calendar

Register a Microsoft Entra application with delegated `Calendars.ReadWrite`
permission and the exact `MICROSOFT_CALENDAR_REDIRECT_URI` as a Web redirect
URI. The app requests delegated `Calendars.ReadWrite` and `offline_access`.
Configure the client ID/secret and, for a single-tenant app, the tenant ID.
The app uses authorization-code flow with PKCE and stores tokens encrypted on
the server.

#### Canvas

Ask the institution's Canvas administrator to create a developer key using
`CANVAS_REDIRECT_URI` and the read-only scopes
`url:GET|/api/v1/courses` and
`url:GET|/api/v1/courses/:course_id/assignments`. Set `CANVAS_ALLOWED_HOSTS` to
exact hosts such as `canvas.school.example` (hostnames only). A user-provided
URL is accepted only when its HTTPS origin matches this server allowlist.

#### Moodle

Moodle OAuth and web-service APIs differ by institution and installed plugins.
Have the Moodle administrator provision the client, scopes, endpoints, and
course/assignment services; set all `MOODLE_*` variables and allowlist the
exact host. Configure the courses endpoint to return a JSON array of records
with `id`/`name`, and the assignment URL template to accept the literal
`{courseId}` placeholder and return records with an ID, name, and due date.
Endpoints must be HTTPS and on the same origin as the selected allowlisted
instance. Configure the endpoints to return all rows needed for import; the
generic adapter does not infer Moodle-specific pagination. This adapter does
not claim compatibility with every Moodle setup; verify its response format
against that institution before enabling it.

The callback clears OAuth query parameters from browser history and exchanges
the authorization code on the server. Tokens are AES-GCM encrypted with
`INTEGRATION_TOKEN_ENCRYPTION_KEY`; losing or changing the key makes existing
tokens unreadable, so rotate only with a migration/reconnect plan. Missing
configuration is shown as **Not configured** and does not enable Connect.
No live provider credentials were available during implementation, so OAuth
and provider API behavior must be tested with each institution's test account
before production rollout.

## Academic toolkit and review scheduling

The authenticated `/academic-tools` page includes user-owned exam roadmaps,
weighted assignment rubrics, a research-source organizer with basic APA/MLA
formatting from entered metadata, university/scholarship application checklists,
and a private monthly budget and expense tracker. Citation formatting is not
AI-generated and should be checked against the institution's required style.
Flashcards now use spaced-review dates and Again/Hard/Good/Easy ratings; the
dashboard reports cards due for review.

Apply `supabase/migrations/20261120120000_student_toolkit.sql` to each
Supabase environment before deploying these features. It adds flashcard review
fields and user-scoped tables protected with row-level security. New toolkit
records are included in account JSON/CSV exports and are removed through the
existing auth-user cascade on account deletion.

If Supabase reports that `public.budget_profiles` is missing from its schema
cache, apply `supabase/migrations/20261121150000_budget_profiles_schema_cache.sql`
through the Supabase migration workflow. It creates the per-user budget table
if needed, applies owner-only RLS and grants, then requests a PostgREST schema
reload. The application cannot apply this migration to a hosted Supabase
project automatically.

See [Community and learning integrations](#community-and-learning-integrations)
for the current LMS implementation status and community deployment requirements.
Unauthenticated public note/deck links are not part of this phase.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3e50981c-5a9a-4f62-9cf5-6b36c853deb0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitLab and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Local study toolkit

The authenticated dashboard includes five study utilities that work without new database tables:

- **Concept Challenger** uses local reflection prompts; it is not presented as an AI response.
- **Midnight Exam Crammer** summarizes saved notes and offers a small general formula reference. It does not invent missing course content.
- **Sleep & Study Cycle Optimizer** creates an editable study rhythm from an exam date and sleep window. It is a planning aid, not medical advice.
- **Mistake Analyzer** groups submitted quiz mistakes by saved subject and topic. If quiz history cannot be saved remotely, submitted attempts are marked and retained in this browser only.
- **Parent Progress Report** creates an informational metrics snapshot encrypted in a URL fragment. Anyone with the complete link can view it. Its 30-day expiry is checked client-side and can be bypassed; links cannot be revoked. It is not authenticated or tamper-proof: a recipient can alter a link copy and change its displayed numbers, so it must not be treated as verified evidence.

The parent report only contains study-time, quiz-average/count, streak, and task-completion totals. Its URL fragment is not sent in normal HTTP requests, but users should share the link only with people they trust. A server-backed signing and revocation service is required for an authoritative report.

## Extra practice tools

- **Handwriting Scanner** uses Tesseract.js in the browser. The first OCR run downloads its worker and selected English, Urdu, or Hindi language model from the public Tesseract CDN; image recognition itself runs locally. OCR output is editable and should be checked, especially for handwriting and formulas. If OCR cannot load, users can type notes and still save them locally.
- **Exam Calm** includes a two-minute breathing timer, motivational reminders, and a private three-question confidence check.
- **Mock Viva** uses local question prompts, optional AI feedback through `LOVABLE_API_KEY`, and transparent heuristic feedback when AI is unavailable; it is not an official examiner or grade. Browser speech-to-text availability and privacy depend on the browser and its speech service.
- **Distraction Blocker** uses voluntary browser fullscreen and pauses when the tab becomes hidden. Browsers cannot prevent leaving a tab or provide an unbreakable lock.
- **Peer Note Exchange & Doubt Bounties** uses server-side coin transactions and peer-visible records when the migration below is applied. Without it, note shares and bounty drafts are stored in the signed-in account's browser cache only and are not visible to other students; peer answers and awards are unavailable.

For cross-student note exchange, apply [`supabase/migrations/20261122100000_peer_note_marketplace.sql`](./supabase/migrations/20261122100000_peer_note_marketplace.sql) to Supabase. It creates private tables with direct client grants revoked and authenticated RPCs for marketplace reads, note sharing, escrowed bounty posting, answers, and one-time answer awards. The browser does not write coin balances directly. Until the migration is applied, all other tools above continue to work without it.

The ignored root `.env` can hold local values for `SUPABASE_PROJECT_ID`,
`SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_URL`. The project-ID
variables are informational; the app initializes Supabase from the URL and
publishable-key variables. Keep `.env` out of Git.

On Vercel, add those same six names to the `www-studenthub-com` project's
Environment Variables and select Production, Preview, and Development as
needed. The two `VITE_` URL/key variables are required in the browser bundle.
Authenticated server functions prefer the unprefixed URL/key variables and can
fall back to the `VITE_` values. A missing browser variable displays a setup
message in the app rather than triggering an uncaught Supabase initialization.
The Vite/Nitro config auto-detects Vercel when building there; no `vercel.json`
is currently required. To locally verify Vercel-target output explicitly, run
`NITRO_PRESET=vercel npm run build`.

Apply the peer marketplace migration to the Supabase project used by the
deployment (for example, with `supabase db push` or the Supabase SQL editor)
before enabling cross-student sharing. Configure
`LOVABLE_API_KEY` as a server-only variable to enable Coach and Mock Viva AI.
AI calls also use the existing `consume_ai_question` Supabase RPC; apply the
project's AI-usage Drizzle migrations if that RPC is not installed. Without
these settings or the quota RPC, the local study-plan and viva feedback remain
available. No service-role key is needed for these new features.

To test and deploy from a local Git checkout:

```sh
npm run build
NITRO_PRESET=vercel npm run build
git add -A
git commit -m "Fix Supabase environment setup"
git push origin main
```

After pushing, confirm the Vercel project is linked to the pushed branch, set
the six variables for the target deployment environment, and trigger a new
deployment. Never put a Supabase service-role key in a `VITE_` variable; some
separate server-side account/integration features may require it as a private
Vercel variable.

Authenticated server functions also use a database-backed limit of 120 requests
per signed-in user per minute. Apply
[`supabase/migrations/20261123190000_authenticated_request_rate_limit.sql`](./supabase/migrations/20261123190000_authenticated_request_rate_limit.sql)
to each Supabase project before deploying this middleware change. The rate-limit
table is private and can only be updated through its authenticated RPC. This
does not replace Supabase Auth protections or rate limits for unauthenticated
sign-in and sign-up requests; configure those in Supabase Auth and Vercel.
