import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Flame, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { useAuth, useDb } from "@/lib/auth";
import { computeStats, logSession, scopedRows, updateTask } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/study-mode")({
  head: () => ({
    meta: [
      { title: "Study Mode — Student Hub" },
      { name: "description", content: "A calm, distraction-free focus screen with a timer, your current task and saved sessions." },
      { property: "og:title", content: "Study Mode — Student Hub" },
      { property: "og:description", content: "One task, one timer, no distractions." },
      { property: "og:type", "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyModePage,
});

const PRESETS = [25, 45, 90];

function StudyModePage() {
  const { user } = useAuth();
  const db = useDb();
  const [minutes, setMinutes] = useState(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<number | null>(null); // minutes of the finished session
  const [taskId, setTaskId] = useState<string>("");
  const completeRef = useRef<() => void>(() => {});

  if (!user) return null;
  const stats = computeStats(db, user.id);
  const tasks = scopedRows(db.study_tasks, user.id).filter((t) => !t.done);
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((t) => t.date === today);
  const candidates = todayTasks.length ? todayTasks : tasks.slice(0, 6);
  const task = candidates.find((t) => t.id === taskId) ?? null;

  const finish = useCallback(
    (completedMinutes: number) => {
      setRunning(false);
      setLeft((m) => m); // keep state coherent
      logSession(user.id, completedMinutes, "focus");
      setDone(completedMinutes);
      setMinutes(completedMinutes);
      setLeft(completedMinutes * 60);
    },
    [user],
  );

  const complete = useCallback(() => {
    const elapsed = minutes * 60 - left;
    const completedMinutes = elapsed >= 60 ? Math.round(elapsed / 60) : minutes;
    finish(completedMinutes);
    toast.success("Focus session saved to your progress.");
  }, [finish, left, minutes]);

  completeRef.current = complete;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          completeRef.current();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const pick = (m: number) => {
    setMinutes(m);
    setLeft(m * 60);
    setRunning(false);
    setDone(null);
  };

  const reset = () => {
    setRunning(false);
    setLeft(minutes * 60);
    setDone(null);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const progress = minutes ? ((minutes * 60 - left) / (minutes * 60)) * 100 : 0;

  return (
    <AppShell title="Study Mode" description="One task, one timer, no distractions.">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col items-center rounded-3xl border border-border bg-brand-soft/50 px-6 py-12 text-center">
          <span className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">Focus session</span>

          {done !== null ? (
            <div className="mt-8 flex flex-col items-center">
              <CheckCircle2 className="size-12 text-brand" />
              <p className="mt-4 text-xl font-semibold">Great work. {done} minutes completed.</p>
              <p className="mt-1 text-sm text-muted-foreground">This session is saved to your progress.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button onClick={() => pick(done)} className="bg-brand text-brand-foreground hover:bg-brand/90">
                  Another {done}-minute block
                </Button>
                <Button variant="outline" onClick={() => pick(25)}>
                  Back to 25 min
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-8 font-mono text-6xl font-semibold tabular-nums sm:text-7xl">
                {mm}:{ss}
              </p>
              <div className="mt-6 h-2 w-64 max-w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
              </div>
              {task ? (
                <p className="mt-5 max-w-md text-sm text-muted-foreground">
                  Focusing on <span className="font-medium text-foreground">{task.title}</span>
                  {task.subject ? ` · ${task.subject}` : ""}
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  onClick={() => setRunning((r) => !r)}
                  className="min-w-32 bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={minutes <= 0}
                >
                  {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                  {running ? "Pause" : "Start Focus Session"}
                </Button>
                <Button variant="outline" onClick={reset}>
                  <RotateCcw className="size-4" /> Reset
                </Button>
                <Button variant="ghost" onClick={() => void completeRef.current()}>
                  Finish now
                </Button>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => pick(p)}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-sm transition-colors",
                      minutes === p && done === null
                        ? "border-brand bg-brand text-brand-foreground"
                        : "border-border text-muted-foreground hover:border-brand/50",
                    )}
                  >
                    {p} min
                  </button>
                ))}
                <input
                  type="number"
                  min="5"
                  max="180"
                  aria-label="Custom minutes"
                  value={minutes}
                  onChange={(e) => {
                    const v = Math.min(180, Math.max(1, Number(e.target.value) || 1));
                    pick(v);
                  }}
                  className="h-9 w-20 rounded-full border border-border bg-background px-3 text-sm tabular-nums"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="panel p-5">
            <h2 className="text-sm font-semibold">Pick your current task</h2>
            {candidates.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Nothing scheduled. You can still focus — or{" "}
                <Link to="/planner" className="text-accent-foreground underline">
                  plan a session
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {candidates.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setTaskId(t.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                        t.id === task?.id ? "border-brand bg-brand-soft/50" : "border-border hover:border-brand/50",
                      )}
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{t.minutes} min</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {task ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => {
                  updateTask(task.id, { done: true });
                  toast.success("Task marked complete.");
                  setTaskId("");
                }}
              >
                <CheckCircle2 className="size-4" /> Mark task complete
              </Button>
            ) : null}
          </div>

          <div className="panel p-5">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-warning" />
              <h2 className="text-sm font-semibold">Streak</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {stats.streak
                ? `${stats.streak} day${stats.streak === 1 ? "" : "s"} in a row · best ${stats.bestStreak}.`
                : "Finish your first session to start a streak."}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
              <Link to="/pomodoro">
                <Timer className="size-4" /> Session history
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
