# Pending upgrade-spec work

Source: user's 714-line upgrade spec ("Upgrade my existing Student Hub..."). Homepage, onboarding, AI Coach, AI Notes→Study system, AI quiz generation are done.

Remaining:
- [x] Data layer: courses table (store.ts + data.ts + cloud sync)
- [x] Migration: public.courses with RLS + grants, applied to cloud
- [x] Smart GPA Center (/gpa): courses, credits, grades, GPA + target GPA, "what do I need on my final"
- [x] Course pages (/courses): create courses, linked assignments/exams/notes, AI actions
- [x] AI Syllabus Scanner (/syllabus): paste/PDF/image → courses, assignments, exams, dates → planner
- [x] Study Mode (/study-mode): calm focus screen, presets + custom timer, session logging
- [x] Dashboard = Semester Dashboard: Deadline Protection card, upcoming, week, GPA, coach
- [x] Progress = Study Analytics: focus sessions, most productive day, consistency, tasks/day chart
- [x] Navigation updated (sidebar + mobile)
- [x] Typecheck, build, browser smoke test
