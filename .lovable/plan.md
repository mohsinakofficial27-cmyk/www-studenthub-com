# Student Hub 2.0

Build the requested study player, sharing flow, and real-data growth analytics without replacing existing authentication, storage patterns, or visual identity.

## User-facing work
- Add `/study-player` with safe YouTube URL parsing, the official IFrame Player API, playback controls and status, saved resume position, synchronized notes and clickable timestamps, and a mobile video-first layout.
- Add ambient audio controls for Off, Lofi, and White Noise. Audio will be original browser-generated sound, only start after an explicit click, and never bypass YouTube ads.
- Add four subject categories and admin playlist management. The categories will start empty rather than displaying invented videos; admins can add real YouTube IDs.
- Add consent-led sharing controls to flashcard decks and notes, public `/s/$token` previews, WhatsApp and copy links, disable/revoke controls, authenticated import, and a Shared With Me page.
- Extend the admin area with real share and usage metrics; show no fabricated or historical activity.

## Implementation approach
- Add the six requested database entities with explicit grants, row-level access rules, indexes, and constraints through a Lovable Cloud migration.
- Keep public share tokens cryptographically random and store only token hashes. Public previews return only a small safe DTO; imports revalidate the share and run atomically with duplicate protection.
- Use authenticated server functions for owner/admin operations and imports, and narrowly scoped database functions for public share preview/event recording.
- Reuse the existing TanStack Start routes, authenticated layout, Supabase-backed store, and Student Hub design tokens; add no application dependencies.
- Verify URL parsing, player states and seeking, persistence, audio interactions, share/revoke/preview/import flow, authorization boundaries, admin analytics, and mobile layout.

## Technical details
- Tables: `study_lectures`, `lecture_notes`, `study_playlists`, `shared_content`, `share_events`, and `shared_content_imports`.
- The official YouTube player remains subject to YouTube availability, embedding permissions, and advertising. Empty playlist categories are expected until an admin adds real entries.
- Analytics will begin accumulating after release; study-session totals will use existing recorded sessions, and daily activity will be labeled according to the events actually captured.
