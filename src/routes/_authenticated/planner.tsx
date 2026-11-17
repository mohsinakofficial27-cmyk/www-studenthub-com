import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useDb } from "@/lib/auth";
import { createTask, deleteTask, scopedRows, updateTask } from "@/lib/data";
import { localDateKey, todayISO } from "@/lib/store";
import { formatDateKey, formatTime } from "@/lib/formatting";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/planner")({
  head: () => ({
    meta: [
      { title: "Study Planner — Student Hub" },
      {
        name: "description",
        content: "Schedule subjects, topics, tasks and exams by day, week or month.",
      },
      { property: "og:title", content: "Study Planner — Student Hub" },
      { property: "og:description", content: "Plan your study week." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlannerPage,
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

type View = "today" | "week" | "month";

function PlannerPage() {
  const { user } = useAuth();
  const db = useDb();
  const [view, setView] = useState<View>("today");
  const [form, setForm] = useState({
    subject: "",
    topic: "",
    title: "",
    date: todayISO(),
    time: "18:00",
    minutes: 45,
    priority: "medium" as "low" | "medium" | "high",
    is_exam: false,
  });

  if (!user) return null;
  const settings = db.user_settings.find((row) => row.user_id === user.id);
  const locale =
    settings?.language === "ur"
      ? "ur-PK"
      : settings?.language === "es"
        ? "es-ES"
        : settings?.language === "fr"
          ? "fr-FR"
          : settings?.language === "de"
            ? "de-DE"
            : settings?.language === "ar"
              ? "ar"
              : "en-US";
  const tasks = scopedRows(db.study_tasks, user.id);

  const today = todayISO();
  const periodStart = new Date();
  if (view === "week") {
    const startOfWeek = settings?.week_starts_on ?? 0;
    periodStart.setDate(periodStart.getDate() - ((periodStart.getDay() - startOfWeek + 7) % 7));
  }
  const startKey = view === "today" ? today : localDateKey(periodStart);
  const periodEnd = new Date(periodStart);
  periodEnd.setDate(periodEnd.getDate() + (view === "month" ? 29 : view === "week" ? 6 : 0));
  const endKey = localDateKey(periodEnd);

  const visible = tasks
    .filter((t) => (view === "today" ? t.date === today : t.date >= startKey && t.date <= endKey))
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const done = visible.filter((t) => t.done).length;
  const percent = visible.length ? Math.round((done / visible.length) * 100) : 0;

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Give the task a name.");
      return;
    }
    createTask(user.id, {
      subject: form.subject.trim() || "General",
      topic: form.topic.trim(),
      title: form.title.trim(),
      date: form.date,
      time: form.time,
      minutes: Number(form.minutes) || 30,
      priority: form.priority,
      is_exam: form.is_exam,
    });
    setForm((f) => ({ ...f, title: "", topic: "" }));
    toast.success(form.is_exam ? "Exam added to your planner." : "Task added.");
  };

  return (
    <AppShell
      title="Study Planner"
      description="Build your schedule, mark things off, and keep exam dates in view."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            {(["today", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors",
                  view === v
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border text-muted-foreground hover:border-brand/50",
                )}
              >
                {v}
              </button>
            ))}
            <span className="ml-auto text-sm text-muted-foreground">
              {visible.length ? `${percent}% complete` : "Nothing scheduled"}
            </span>
          </div>

          {visible.length ? (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
          ) : null}

          {visible.length === 0 ? (
            <EmptyState
              className="mt-5 border-0 bg-transparent"
              icon={CalendarDays}
              title="No tasks in this view"
              description="Add a subject, topic and time on the right to start building your study schedule."
            />
          ) : (
            <ul className="mt-5 space-y-2">
              {visible.map((t) => (
                <li
                  key={t.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3",
                    t.is_exam ? "border-warning/50 bg-warning/5" : "border-border",
                  )}
                >
                  <Checkbox
                    checked={t.done}
                    onCheckedChange={(v) => updateTask(t.id, { done: Boolean(v) })}
                    aria-label={`Mark ${t.title} complete`}
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        t.done && "line-through text-muted-foreground",
                      )}
                    >
                      {t.is_exam ? "Exam: " : ""}
                      {t.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.subject}
                      {t.topic ? ` · ${t.topic}` : ""} ·{" "}
                      {formatDateKey(t.date, locale, settings?.date_format ?? "locale")}
                      {t.time
                        ? ` ${formatTime(t.time, locale, settings?.time_format ?? "12h")}`
                        : ""}{" "}
                      · {t.minutes} min
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                    {t.priority}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete task"
                    onClick={() => deleteTask(t.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={add} className="panel h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold">Add to planner</h2>
          <div className="space-y-2">
            <Label htmlFor="ttitle">Task</Label>
            <Input
              id="ttitle"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Revise quadratic equations"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="tsubject">Subject</Label>
              <Input
                id="tsubject"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ttopic">Topic</Label>
              <Input
                id="ttopic"
                value={form.topic}
                onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tdate">Date</Label>
              <Input
                id="tdate"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ttime">Time</Label>
              <Input
                id="ttime"
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tminutes">Minutes</Label>
              <Input
                id="tminutes"
                type="number"
                min="5"
                step="5"
                value={form.minutes}
                onChange={(e) => setForm((f) => ({ ...f, minutes: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tpriority">Priority</Label>
              <select
                id="tpriority"
                className={selectClass}
                value={form.priority}
                onChange={(e) =>
                  setForm((f) => ({ ...f, priority: e.target.value as "low" | "medium" | "high" }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={form.is_exam}
              onCheckedChange={(v) => setForm((f) => ({ ...f, is_exam: Boolean(v) }))}
            />
            This is an exam date
          </label>
          <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            Add to planner
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
