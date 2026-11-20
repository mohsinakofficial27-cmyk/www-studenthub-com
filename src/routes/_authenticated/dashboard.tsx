import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  BrainCircuit,
  CalendarDays,
  Flame,
  GraduationCap,
  HeartPulse,
  ListChecks,
  MessageSquare,
  MicVocal,
  MoonStar,
  LockKeyhole,
  Repeat2,
  ScanSearch,
  ScanText,
  Share2,
  Timer,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useDb } from "@/lib/auth";
import {
  computeGpa,
  computeStats,
  deadlineSummary,
  dueCards,
  scopedRows,
  updateTask,
  weekSchedule,
} from "@/lib/data";
import { useI18n, type MessageKey } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Student Hub" },
      {
        name: "description",
        content: "Your streak, today's tasks, study time and quiz average in one view.",
      },
      { property: "og:title", content: "Dashboard — Student Hub" },
      { property: "og:description", content: "Your personal study dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

const QUICK: { label: MessageKey; to: string; icon: LucideIcon }[] = [
  { label: "askAi", to: "/assistant", icon: MessageSquare },
  { label: "createNotes", to: "/notes", icon: BookOpen },
  { label: "generateQuiz", to: "/quizzes", icon: ListChecks },
  { label: "planSession", to: "/planner", icon: CalendarDays },
  { label: "startStudyMode", to: "/study-mode", icon: Timer },
];

const EXAM_TOOLKIT: { title: string; description: string; to: string; icon: LucideIcon }[] = [
  {
    title: "Concept Challenger",
    description: "Test your reasoning",
    to: "/concept-challenger",
    icon: BrainCircuit,
  },
  {
    title: "Midnight Exam Crammer",
    description: "Review saved notes fast",
    to: "/exam-crammer",
    icon: Zap,
  },
  {
    title: "Sleep & Study Optimizer",
    description: "Plan around your rest",
    to: "/sleep-optimizer",
    icon: MoonStar,
  },
  {
    title: "Mistake Analyzer",
    description: "Find quiz topics to revisit",
    to: "/mistake-analyzer",
    icon: ScanSearch,
  },
  {
    title: "Parent Progress Report",
    description: "Share a private snapshot",
    to: "/parent-report",
    icon: Share2,
  },
  {
    title: "Handwriting Scanner",
    description: "Turn a photo into notes",
    to: "/handwriting-scanner",
    icon: ScanText,
  },
  { title: "Exam Calm", description: "Breathe and reset", to: "/exam-calm", icon: HeartPulse },
  {
    title: "Note Exchange",
    description: "Share notes and bounties",
    to: "/note-exchange",
    icon: Repeat2,
  },
  { title: "Mock Viva", description: "Practise answers aloud", to: "/mock-viva", icon: MicVocal },
  {
    title: "Distraction Blocker",
    description: "Pause when you switch tabs",
    to: "/study-lock",
    icon: LockKeyhole,
  },
];

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function DashboardPage() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const db = useDb();
  if (!user) return null;
  const stats = computeStats(db, user.id);
  const dl = deadlineSummary(db, user.id);
  const week = weekSchedule(db, user.id);
  const gradingSystem =
    db.user_settings.find((row) => row.user_id === user.id)?.grading_system ?? "gpa4";
  const gpa = computeGpa(scopedRows(db.courses, user.id), gradingSystem);
  const dueReviewCount = dueCards(scopedRows(db.flashcards, user.id)).length;
  const atRisk = [...dl.overdue, ...dl.dueToday.filter((t) => t.priority === "high")];
  const firstName = (profile?.name ?? user.name).split(" ")[0];

  return (
    <AppShell title={`${t("welcomeBack")}, ${firstName} 👋`} description={t("dashboardSummary")}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label={t("studyStreak")}
          value={stats.streak ? `${stats.streak} days` : "—"}
          hint={stats.streak ? `Best: ${stats.bestStreak} days` : "Log a focus session to start"}
        />
        <Stat
          label={t("todaysProgress")}
          value={stats.todayTasks.length ? `${stats.todayPercent}%` : "—"}
          hint={
            stats.todayTasks.length
              ? `${stats.todayTasks.filter((t) => t.done).length}/${stats.todayTasks.length} tasks done`
              : "No tasks scheduled"
          }
        />
        <Stat
          label={t("studyTime")}
          value={stats.totalHours ? `${stats.totalHours} h` : "—"}
          hint={stats.totalHours ? `${stats.weekHours} h this week` : "From your pomodoro sessions"}
        />
        <Stat
          label={t("quizAverage")}
          value={stats.quizAverage ? `${stats.quizAverage}%` : "—"}
          hint={stats.quizAverage ? "Across all attempts" : "Take a quiz to see this"}
        />
        <Stat
          label={t("upcomingExam")}
          value={stats.nextExam ? stats.nextExam.title : "—"}
          hint={
            stats.nextExam
              ? stats.daysToExam === 0
                ? "Today"
                : `in ${stats.daysToExam} day${stats.daysToExam === 1 ? "" : "s"}`
              : "Add an exam in the planner"
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold">{t("deadlineProtection")}</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
            {[
              [t("overdue"), dl.overdue.length],
              [t("dueToday"), dl.dueToday.length],
              [t("tomorrow"), dl.dueTomorrow.length],
              [t("thisWeek"), dl.dueThisWeek.length],
              [t("doneToday"), dl.completedToday],
            ].map(([l, v]) => (
              <div key={String(l)} className="rounded-xl bg-surface px-2 py-3">
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
          {atRisk.length ? (
            <ul className="mt-3 space-y-1.5">
              {atRisk.slice(0, 4).map((t) => (
                <li key={t.id} className="rounded-xl border border-warning/50 px-3 py-2 text-sm">
                  ⚠ {t.title}{" "}
                  {t.date < new Date().toISOString().slice(0, 10) ? "is overdue" : "is due today"} —
                  recommended: start a 30-minute session now.
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">{t("onTrack")}</p>
          )}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {t("plannedStudy")}
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
              {week.map((d) => (
                <div key={d.date} className="rounded-lg bg-surface py-2">
                  <p className="text-muted-foreground">{d.day}</p>
                  <p className="font-medium">{d.minutes ? `${d.minutes}m` : "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">{t("currentGpa")}</h2>
          <p className="mt-2 text-3xl font-semibold">{gpa !== null ? gpa.toFixed(2) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {gpa !== null ? "Estimate from your course grades" : "Add courses and grades to see it"}
          </p>
          <div className="mt-4 grid gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/gpa">GPA Center</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/coach">Ask AI Coach for a plan</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/syllabus">Scan a syllabus</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-brand/20 bg-brand-soft/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-background text-brand shadow-sm">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Study together in a Group Study Room</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start a live video session, invite classmates, and share notes in room chat.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0 bg-brand text-brand-foreground hover:bg-brand/90">
          <Link to="/study-room">Open study rooms</Link>
        </Button>
      </section>

      <section className="mt-6">
        <div className="mb-3">
          <h2 className="text-lg font-semibold">Your study toolkit</h2>
          <p className="text-sm text-muted-foreground">
            Quick tools for revision, reflection, and sharing progress.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {EXAM_TOOLKIT.map(({ title, description, to, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="panel flex items-start gap-3 p-4 transition-colors hover:border-brand/50 hover:bg-brand-soft/30"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                <Icon className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-medium">{title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{description}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("todayTasks")}</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/planner">{t("openPlanner")}</Link>
            </Button>
          </div>
          {stats.todayTasks.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 bg-transparent py-10"
              icon={CalendarDays}
              title={t("nothingScheduled")}
              description="Add subjects, topics and times in the planner and they'll appear here each morning."
              action={
                <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
                  <Link to="/planner">Plan a study session</Link>
                </Button>
              }
            />
          ) : (
            <ul className="mt-4 space-y-2">
              {stats.todayTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3"
                >
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(v) => updateTask(t.id, { done: Boolean(v) })}
                    aria-label={`Mark ${t.title} complete`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        t.done
                          ? "text-sm line-through text-muted-foreground"
                          : "text-sm font-medium"
                      }
                    >
                      {t.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.subject}
                      {t.topic ? ` · ${t.topic}` : ""}
                      {t.time ? ` · ${t.time}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                    {t.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-lg font-semibold">{t("quickActions")}</h2>
            <div className="mt-3 grid gap-2">
              {QUICK.map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
                >
                  <Icon className="size-4 text-accent-foreground" />
                  {t(label)}
                </Link>
              ))}
              <Link
                to="/academic-tools"
                className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
              >
                <GraduationCap className="size-4 text-accent-foreground" />
                Academic Toolkit
              </Link>
            </div>
          </div>

          <div className="panel p-5">
            <h2 className="text-sm font-semibold">Spaced repetition</h2>
            <p className="mt-2 text-sm text-muted-foreground" role="status">
              {dueReviewCount
                ? `${dueReviewCount} flashcard${dueReviewCount === 1 ? "" : "s"} ready to review.`
                : "You're all caught up on flashcard reviews."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link to="/flashcards">
                {dueReviewCount ? "Review due cards" : "Open flashcards"}
              </Link>
            </Button>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-warning" />
              <h2 className="text-sm font-semibold">{t("streak")}</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {stats.streak
                ? `You've studied ${stats.streak} day${stats.streak === 1 ? "" : "s"} in a row. Keep it going.`
                : "No study activity yet. Complete your first study session to start building your progress."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
              <Link to="/progress">
                <TrendingUp className="size-4" /> {t("viewProgress")}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
