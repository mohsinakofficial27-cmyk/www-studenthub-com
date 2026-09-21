import { Link, createFileRoute } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth, useDb } from "@/lib/auth";
import { computeStats } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Student Hub" },
      { name: "description", content: "Study hours, completed tasks, quiz scores, streaks and subject performance." },
      { property: "og:title", content: "Progress — Student Hub" },
      { property: "og:description", content: "See how your studying is going." },
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

function ProgressPage() {
  const { user } = useAuth();
  const db = useDb();
  if (!user) return null;
  const stats = computeStats(db, user.id);
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
              <Link to="/pomodoro">Start a focus session</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="Progress" description="Everything here comes from work you've actually logged.">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label="Total study hours" value={`${stats.totalHours} h`} hint="All focus sessions" />
        <Stat label="This week" value={`${stats.weekHours} h`} hint="Last 7 days" />
        <Stat label="Tasks completed" value={String(stats.tasksCompleted)} hint="Across your planner" />
        <Stat label="Quiz average" value={stats.quizAverage ? `${stats.quizAverage}%` : "—"} hint="All attempts" />
        <Stat label="Current streak" value={`${stats.streak} days`} hint="Consecutive study days" />
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
              <Tooltip
                cursor={{ fill: "var(--secondary)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  color: "var(--foreground)",
                }}
              />
              <Bar dataKey="minutes" fill="var(--brand)" radius={[6, 6, 0, 0]} />
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
    </AppShell>
  );
}
