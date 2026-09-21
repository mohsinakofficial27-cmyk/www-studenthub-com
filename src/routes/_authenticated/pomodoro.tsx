import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useDb } from "@/lib/auth";
import { logSession, scopedRows } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/pomodoro")({
  head: () => ({
    meta: [
      { title: "Pomodoro — Student Hub" },
      { name: "description", content: "Focus and break timer with every session saved to your study history." },
      { property: "og:title", content: "Pomodoro — Student Hub" },
      { property: "og:description", content: "Focus timer with session tracking." },
    ],
  }),
  component: PomodoroPage,
});

function PomodoroPage() {
  const { user } = useAuth();
  const db = useDb();
  const [focusMin, setFocusMin] = useState(25);
  const [breakMin, setBreakMin] = useState(5);
  const [mode, setMode] = useState<"focus" | "break">("focus");
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const completeRef = useRef<() => void>(() => {});

  const sessions = user ? scopedRows(db.study_sessions, user.id) : [];
  const focusSessions = sessions.filter((s) => s.kind === "focus");

  const complete = useCallback(() => {
    setRunning(false);
    if (user) logSession(user.id, mode === "focus" ? focusMin : breakMin, mode);
    if (mode === "focus") {
      toast.success(`Focus session saved — ${focusMin} minutes.`);
      setMode("break");
      setLeft(breakMin * 60);
    } else {
      toast.success("Break over. Back to it.");
      setMode("focus");
      setLeft(focusMin * 60);
    }
  }, [user, mode, focusMin, breakMin]);

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

  const reset = () => {
    setRunning(false);
    setLeft((mode === "focus" ? focusMin : breakMin) * 60);
  };

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  const totalMinutes = focusSessions.reduce((s, x) => s + x.minutes, 0);

  return (
    <AppShell title="Pomodoro" description="Focus in blocks. Every completed session is logged to your progress.">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel flex flex-col items-center p-8 lg:col-span-2">
          <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-accent-foreground">
            {mode === "focus" ? "Focus session" : "Break"}
          </span>
          <p className="mt-6 font-mono text-6xl font-semibold tabular-nums sm:text-7xl">
            {mm}:{ss}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              onClick={() => setRunning((r) => !r)}
              className="min-w-28 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {running ? "Pause" : "Start"}
            </Button>
            <Button variant="outline" onClick={reset}>
              Reset
            </Button>
            <Button variant="ghost" onClick={complete}>
              Finish now
            </Button>
          </div>

          <div className="mt-9 grid w-full max-w-sm gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="focus">Focus minutes</Label>
              <Input
                id="focus"
                type="number"
                min="1"
                value={focusMin}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  setFocusMin(v);
                  if (mode === "focus" && !running) setLeft(v * 60);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="break">Break minutes</Label>
              <Input
                id="break"
                type="number"
                min="1"
                value={breakMin}
                onChange={(e) => {
                  const v = Math.max(1, Number(e.target.value) || 1);
                  setBreakMin(v);
                  if (mode === "break" && !running) setLeft(v * 60);
                }}
              />
            </div>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Session history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {focusSessions.length} focus session{focusSessions.length === 1 ? "" : "s"} ·{" "}
            {Math.round((totalMinutes / 60) * 10) / 10} h total
          </p>
          {sessions.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 bg-transparent py-8"
              icon={Timer}
              title="No sessions yet"
              description="Start the timer and finish a block — it will show up here and in your progress."
            />
          ) : (
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
              {sessions.slice(0, 40).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3.5 py-2.5 text-sm">
                  <span className="capitalize">{s.kind}</span>
                  <span className="text-muted-foreground">
                    {s.minutes} min · {new Date(s.ended_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
