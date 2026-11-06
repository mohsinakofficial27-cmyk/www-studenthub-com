import { Link, createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth, useDb } from "@/lib/auth";
import { computeStats, scopedRows } from "@/lib/data";
import { todayISO } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Student Hub" },
      { name: "description", content: "Study hours, completed tasks, focus sessions, streaks, consistency and subject performance." },
      { property: "og:title", content: "Progress — Student Hub" },
      { property: "og:description", content: "See how your studying is going." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProgressPage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="panel p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const chartTooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "0.75rem",
  color: "var(--foreground)",
} as const;

function ProgressPage() {
  const { user } = useAuth();
  const db = useDb();
  if (!user) return null;
  const stats = computeStats(db, user.id);
  const today = todayISO();

  // Real data only — every number below comes from the student's own logged activity.
  const sessions = scopedRows(db.study_sessions, user.id).filter((s) => s.kind === "focus");
  const focusSessions = sessions.length;

  // Tasks completed per day, last 7 days.
  const taskDaily: { day: string; done: number }[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    taskDaily.push({
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      done: scopedRows(db.study_tasks, user.id).filter((t) => t.done && t.date === key).length,
    });
  }

  const mostProductive = [...stats.weekly].sort((a, b) => b.minutes - a.minutes)[0] ?? null;
  const studiedDays = new Set(sessions.map((s) => s.ended_at.slice(0, 10)));
  let active14 = 0;
  for (let i = 0; i < 14; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (studiedDays.has(d.toISOString().slice(0, 10))) active14 += 1;
  }
  const consistency = Math.round((active14 / 14) * 100);
  const hasActivity = stats.totalHours > 0 || stats.tasksCompleted > 0 || stats.quizAverage > 0;

  if (!hasActivity) {
    return (
      <AppShell title="Progress" description="Your study analytics build up as you use the tools.">
        <EmptyState
          icon={TrendingUp}
          title="No study activity yet"
          description="Complete your first study session to start building your progress."
          action={
            <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to="/study-mode">Start a focus session</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Study Analytics" description="Everything here comes from work you've actually logged.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total study hours" value={`${stats.totalHours} h`} hint="All focus sessions" />
        <Stat label="This week" value={`${stats.weekHours} h`} hint="Last 7 days" />
        <Stat label="Tasks completed" value={String(stats.tasksCompleted)} hint="Across your planner" />
        <Stat label="Quiz average" value={stats.quizAverage ? `${stats.quizAverage}%` : "—"} hint="All attempts" />
        <Stat label="Focus sessions" value={String(focusSessions)} hint="Completed blocks all-time" />
        <Stat label="Current streak" value={`${stats.streak} days`} hint={`Best: ${stats.bestStreak} days`} />
        <Stat
          label="Most productive day"
          value={mostProductive && mostProductive.minutes > 0 ? mostProductive.day : "—"}
          hint={mostProductive && mostProductive.minutes > 0 ? `${mostProductive.minutes} min studied` : "Last 7 days"}
        />
        <Stat
          label="Consistency"
          value={`${consistency}%`}
          hint={`${active14} of the last 14 days with study`}
        />
        <Stat label="Best streak" value={`${stats.bestStreak} days`} hint="Your record so far" />
      </div>

      <div className="panel mt-4 p-5">
        <h2 className="text-lg font-semibold">Study minutes, last 7 days</h2>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weekly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={chartTooltipStyle} />
              <Bar dataKey="minutes" fill="var(--brand)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel mt-4 p-5">
        <h2 className="text-lg font-semibold">Tasks completed, last 7 days</h2>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={taskDaily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: "var(--secondary)" }} contentStyle={chartTooltipStyle} />
              <Bar dataKey="done" name="Tasks done" fill="var(--warning)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel mt-4 p-5">
        <h2 className="text-lg font-semibold">Subject performance</h2>
        {stats.subjects.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Take a quiz in a subject and your average for it will appear here.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stats.subjects.map((s) => (
              <li key={s.subject}>
                <div className="flex justify-between text-sm">
                  <span>{s.subject}</span>
                  <span className="text-muted-foreground">
                    {s.average}% · {s.attempts} attempt{s.attempts === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${s.average}%` }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Analytics reflect {today ? "your logged study activity only" : "your logged activity"} — no estimates or placeholders.
      </p>
    </AppShell>
  );
}
