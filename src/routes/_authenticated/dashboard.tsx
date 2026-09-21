import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  Flame,
  ListChecks,
  MessageSquare,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, useDb } from "@/lib/auth";
import { computeStats, updateTask } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Student Hub" },
      { name: "description", content: "Your streak, today's tasks, study time and quiz average in one view." },
      { property: "og:title", content: "Dashboard — Student Hub" },
      { property: "og:description", content: "Your personal study dashboard." },
    ],
  }),
  component: DashboardPage,
});

const QUICK: { label: string; to: string; icon: LucideIcon }[] = [
  { label: "Ask AI", to: "/assistant", icon: MessageSquare },
  { label: "Create Notes", to: "/notes", icon: BookOpen },
  { label: "Generate Quiz", to: "/quizzes", icon: ListChecks },
  { label: "Plan Study Session", to: "/planner", icon: CalendarDays },
  { label: "Start Pomodoro", to: "/pomodoro", icon: Timer },
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
  const db = useDb();
  if (!user) return null;
  const stats = computeStats(db, user.id);
  const firstName = (profile?.name ?? user.name).split(" ")[0];

  return (
    <AppShell title={`Welcome back, ${firstName} 👋`} description="Here's where your studying stands today.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat
          label="Study streak"
          value={stats.streak ? `${stats.streak} days` : "—"}
          hint={stats.streak ? `Best: ${stats.bestStreak} days` : "Log a focus session to start"}
        />
        <Stat
          label="Today's progress"
          value={stats.todayTasks.length ? `${stats.todayPercent}%` : "—"}
          hint={stats.todayTasks.length ? `${stats.todayTasks.filter((t) => t.done).length}/${stats.todayTasks.length} tasks done` : "No tasks scheduled"}
        />
        <Stat
          label="Study time"
          value={stats.totalHours ? `${stats.totalHours} h` : "—"}
          hint={stats.totalHours ? `${stats.weekHours} h this week` : "From your pomodoro sessions"}
        />
        <Stat
          label="Quiz average"
          value={stats.quizAverage ? `${stats.quizAverage}%` : "—"}
          hint={stats.quizAverage ? "Across all attempts" : "Take a quiz to see this"}
        />
        <Stat
          label="Upcoming exam"
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's tasks</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/planner">Open planner</Link>
            </Button>
          </div>
          {stats.todayTasks.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 bg-transparent py-10"
              icon={CalendarDays}
              title="Nothing scheduled today"
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
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3">
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(v) => updateTask(t.id, { done: Boolean(v) })}
                    aria-label={`Mark ${t.title} complete`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={t.done ? "text-sm line-through text-muted-foreground" : "text-sm font-medium"}>
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
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <div className="mt-3 grid gap-2">
              {QUICK.map(({ label, to, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
                >
                  <Icon className="size-4 text-accent-foreground" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-warning" />
              <h2 className="text-sm font-semibold">Streak</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {stats.streak
                ? `You've studied ${stats.streak} day${stats.streak === 1 ? "" : "s"} in a row. Keep it going.`
                : "No study activity yet. Complete your first study session to start building your progress."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
              <Link to="/progress">
                <TrendingUp className="size-4" /> View progress
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
