import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Expand, LockKeyhole, Pause, Play, ShieldCheck, Unlock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { logSession } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/study-lock")({
  component: StudyLockPage,
});

function StudyLockPage() {
  const { user } = useAuth();
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [locked, setLocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [alerts, setAlerts] = useState(0);
  const [alertMessage, setAlertMessage] = useState("");
  const lastAlert = useRef(0);
  const intentionalExit = useRef(false);

  const interrupt = useCallback(
    (message: string) => {
      if (!locked) return;
      setRunning(false);
      const now = Date.now();
      if (now - lastAlert.current > 1000) {
        setAlerts((count) => count + 1);
        setAlertMessage(message);
        toast.warning(message);
        lastAlert.current = now;
      }
    },
    [locked],
  );

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden")
        interrupt("Focus paused because you left this tab.");
    };
    const onFullscreenChange = () => {
      if (intentionalExit.current) {
        intentionalExit.current = false;
        return;
      }
      if (locked && !document.fullscreenElement)
        interrupt("Fullscreen ended. Your focus timer is paused.");
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [interrupt, locked]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (value <= 1) {
          setRunning(false);
          if (user) logSession(user.id, minutes, "focus");
          toast.success("Focus block complete. Session saved.");
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running, user, minutes]);

  const enterLock = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setLocked(true);
      setAlertMessage("");
      setSecondsLeft(minutes * 60);
    } catch {
      toast.info(
        "Fullscreen was not granted. You can still run the focus timer without fullscreen.",
      );
      setLocked(true);
      setAlertMessage("");
      setSecondsLeft(minutes * 60);
    }
  };

  const leaveLock = async () => {
    setRunning(false);
    setLocked(false);
    setAlertMessage("");
    if (document.fullscreenElement) {
      intentionalExit.current = true;
      try {
        await document.exitFullscreen();
      } catch {
        intentionalExit.current = false;
        toast.info("Use your browser's fullscreen control to exit fullscreen.");
      }
    }
  };

  const changeDuration = (value: number) => {
    const next = Math.min(120, Math.max(5, value || 25));
    setMinutes(next);
    setSecondsLeft(next * 60);
    setRunning(false);
  };

  const display = `${String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:${String(secondsLeft % 60).padStart(2, "0")}`;

  return (
    <AppShell
      title="Distraction Blocker & Study Lock"
      description="A voluntary fullscreen focus timer that pauses when this tab loses visibility."
    >
      <InfoNote
        title="A browser focus aid"
        description="Your browser cannot prevent tab switching or leaving this page. When this tab becomes hidden, the timer pauses and an alert appears when you return. Fullscreen is permission-based and can always be exited."
      />
      {locked ? (
        <main className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-5 text-center">
          <div className="absolute right-5 top-5 flex items-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-xs">
              {alerts} focus alert{alerts === 1 ? "" : "s"}
            </span>
            <Button variant="outline" onClick={() => void leaveLock()}>
              <Unlock className="size-4" /> Exit focus
            </Button>
          </div>
          <ShieldCheck className="size-10 text-brand" />
          <p className="mt-4 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">
            FOCUS MODE
          </p>
          <h1 className="mt-4 text-6xl font-semibold font-mono tabular-nums sm:text-8xl">
            {display}
          </h1>
          {alertMessage ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-warning/15 p-3 text-sm">
              <AlertTriangle className="size-4" />
              {alertMessage}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Stay with one task. Your progress stays on this device.
            </p>
          )}
          <div className="mt-6 flex gap-2">
            <Button
              onClick={() => {
                if (secondsLeft === 0) setSecondsLeft(minutes * 60);
                setRunning((value) => !value);
              }}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {running ? (
                <>
                  <Pause className="size-4" /> Pause timer
                </>
              ) : (
                <>
                  <Play className="size-4" />{" "}
                  {secondsLeft === 0 ? "Start another block" : "Start timer"}
                </>
              )}
            </Button>
            {secondsLeft === 0 ? (
              <Button variant="outline" onClick={() => setSecondsLeft(minutes * 60)}>
                Reset timer
              </Button>
            ) : null}
          </div>
        </main>
      ) : (
        <section className="panel mx-auto mt-4 max-w-xl p-6 text-center">
          <LockKeyhole className="mx-auto size-9 text-brand" />
          <h2 className="mt-3 text-xl font-semibold">Set up a focus block</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            When you leave this tab, the timer pauses. It never blocks navigation.
          </p>
          <label htmlFor="lock-minutes" className="mt-5 block text-sm font-medium">
            Duration in minutes
          </label>
          <input
            id="lock-minutes"
            type="number"
            min="5"
            max="120"
            value={minutes}
            onChange={(event) => changeDuration(Number(event.target.value))}
            className="mx-auto mt-2 h-10 w-32 rounded-md border border-input bg-background px-3 text-center"
          />
          <div className="mt-5">
            <Button
              onClick={() => void enterLock()}
              className="bg-brand text-brand-foreground hover:bg-brand/90"
            >
              <Expand className="size-4" /> Enter focus mode
            </Button>
          </div>
        </section>
      )}
    </AppShell>
  );
}
