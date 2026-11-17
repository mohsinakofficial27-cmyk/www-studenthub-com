import { Link, createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { decryptParentReport, type ParentReportData } from "@/lib/parent-report";

export const Route = createFileRoute("/shared-progress")({
  ssr: false,
  component: SharedParentReportPage,
});

function SharedParentReportPage() {
  const [report, setReport] = useState<ParentReportData | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void decryptParentReport(window.location.hash).then((value) => {
      if (!active) return;
      setReport(value);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8"><Logo to="/" /></div>
        {!ready ? (
          <div className="panel p-8 text-center text-sm text-muted-foreground">Opening the private report…</div>
        ) : !report ? (
          <div className="panel p-6">
            <EmptyState
              icon={ShieldCheck}
              title="This report link is invalid or expired"
              description="Ask the student to create a fresh read-only snapshot from their Parent Progress Report page."
              action={<Button asChild variant="outline"><Link to="/">Go to Student Hub</Link></Button>}
            />
          </div>
        ) : (
          <section className="panel p-6 sm:p-8">
            <p className="text-sm font-medium text-brand">Read-only progress snapshot</p>
            <h1 className="mt-2 text-3xl font-semibold">{report.displayName}'s study progress</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Shared {new Date(report.createdAt).toLocaleDateString()} · Expires {new Date(report.expiresAt).toLocaleDateString()}
            </p>
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              <Metric label="Study time today" value={`${report.todayMinutes} min`} />
              <Metric label="Total focus hours" value={`${report.totalHours} h`} />
              <Metric label="Quiz average" value={report.quizAverage === null ? "No attempts yet" : `${report.quizAverage}%`} />
              <Metric label="Quiz attempts" value={String(report.quizCount)} />
              <Metric label="Study streak" value={`${report.streak} days`} />
              <Metric label="Tasks completed" value={`${report.tasksCompletedToday} today · ${report.tasksCompleted} total`} />
            </dl>
            <p className="mt-6 rounded-xl bg-secondary/60 p-4 text-xs text-muted-foreground">
              Informational snapshot only; it is not authenticated or tamper-proof. Anyone with the complete link can view or alter the displayed numbers, including changing the client-side expiry. Do not treat it as verified.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
