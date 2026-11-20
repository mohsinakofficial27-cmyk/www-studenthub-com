import { createFileRoute } from "@tanstack/react-router";
import { Copy, Link2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth, useDb } from "@/lib/auth";
import { computeStats, scopedRows } from "@/lib/data";
import { createParentReportLink } from "@/lib/parent-report";
import { todayISO } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/parent-report")({
  component: ParentReportPage,
});

function ParentReportPage() {
  const { user, profile } = useAuth();
  const db = useDb();
  const [shareLink, setShareLink] = useState("");
  if (!user) return null;

  const stats = computeStats(db, user.id);
  const tasks = scopedRows(db.study_tasks, user.id);
  const sessions = scopedRows(db.study_sessions, user.id).filter(
    (session) => session.kind === "focus",
  );
  const quizAttempts = scopedRows(db.quiz_attempts, user.id);
  const tasksCompletedToday = tasks.filter((task) => task.done && task.date === todayISO()).length;
  const todayMinutes = sessions
    .filter((session) => session.ended_at.slice(0, 10) === todayISO())
    .reduce((sum, session) => sum + session.minutes, 0);

  const generateLink = async () => {
    try {
      const createdAt = new Date();
      const expiresAt = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const link = await createParentReportLink(
        {
          displayName: profile?.name ?? user.name ?? "Student",
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
          todayMinutes,
          totalHours: stats.totalHours,
          quizAverage: quizAttempts.length ? stats.quizAverage : null,
          quizCount: quizAttempts.length,
          streak: stats.streak,
          tasksCompleted: stats.tasksCompleted,
          tasksCompletedToday,
        },
        window.location.origin,
      );
      setShareLink(link);
    } catch {
      toast.error("Could not create a private report link in this browser.");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      toast.success("Parent report link copied.");
    } catch {
      toast.error("Clipboard access is unavailable. Select and copy the link manually.");
    }
  };

  return (
    <AppShell
      title="Parent Progress Report"
      description="Create a time-limited, read-only snapshot to share your study progress."
    >
      <InfoNote
        title="An informal bearer-link snapshot"
        description="The report is encrypted in the URL fragment and is not sent in normal web requests. Anyone with the link can view it, and a recipient can alter a copy to change the displayed numbers or bypass its client-side 30-day expiry. It is not authenticated, tamper-proof, or revocable, and must not be treated as verified evidence."
      />
      <section className="panel mt-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <ShieldCheck className="size-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold">Snapshot preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Only the metrics below are included; notes, messages, email, and quiz answers are not
              shared. The snapshot is informational, not verified.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Study time today" value={`${todayMinutes} min`} />
              <Metric label="Total focus hours" value={`${stats.totalHours} h`} />
              <Metric
                label="Quiz average"
                value={quizAttempts.length ? `${stats.quizAverage}%` : "No attempts"}
              />
              <Metric label="Quiz attempts" value={String(quizAttempts.length)} />
              <Metric label="Study streak" value={`${stats.streak} days`} />
              <Metric
                label="Tasks completed"
                value={`${tasksCompletedToday} today · ${stats.tasksCompleted} total`}
              />
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={() => void generateLink()}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Link2 className="size-4" /> Create 30-day share link
              </Button>
              {shareLink ? (
                <Button variant="outline" onClick={() => void copyLink()}>
                  <Copy className="size-4" /> Copy link
                </Button>
              ) : null}
            </div>
            {shareLink ? (
              <div className="mt-4 space-y-2">
                <label htmlFor="parent-link" className="text-sm font-medium">
                  Shareable link
                </label>
                <input
                  id="parent-link"
                  readOnly
                  value={shareLink}
                  onFocus={(event) => event.currentTarget.select()}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  This is a snapshot from the moment you created the link. Create another link to
                  share updated numbers.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
