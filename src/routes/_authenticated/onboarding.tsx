import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { createTask } from "@/lib/data";
import { mutate } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Build My Semester — Student Hub" },
      { name: "description", content: "Answer a few questions and Student Hub builds your personalized semester plan." },
      { property: "og:title", content: "Build My Semester — Student Hub" },
      { property: "og:description", content: "Personalised onboarding for your Student Hub dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

const STUDENT_TYPES = ["High School", "College", "University", "Graduate Student"];

const SUBJECTS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
  "Computer Science",
  "Economics",
  "Biology",
  "Chemistry",
  "Physics",
];

const GOALS = [
  "Improve grades",
  "Stay organized",
  "Prepare for exams",
  "Stop procrastinating",
  "Build better study habits",
];

interface DatedItem {
  title: string;
  date: string;
}

const STEPS = ["Student type", "Subjects", "Exams", "Deadlines", "Study hours", "Main goal"];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(date: string) {
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date(`${todayIso()}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

function OnboardingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  const [studentType, setStudentType] = useState(profile?.grade ?? "");
  const [subjects, setSubjects] = useState<string[]>(profile?.subjects ?? []);
  const [exams, setExams] = useState<DatedItem[]>([]);
  const [deadlines, setDeadlines] = useState<DatedItem[]>([]);
  const [hours, setHours] = useState(String(profile?.daily_hours ?? 2));
  const [goal, setGoal] = useState(profile?.goals ?? "");

  const toggle = (s: string) =>
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const updateItem = (list: DatedItem[], set: (v: DatedItem[]) => void, i: number, patch: Partial<DatedItem>) =>
    set(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const canNext =
    step === 0 ? studentType !== "" :
    step === 1 ? subjects.length > 0 :
    step === 4 ? Number(hours) > 0 :
    step === 5 ? goal !== "" :
    true;

  const finish = () => {
    if (!user) return;
    mutate((d) => {
      const p = d.profiles.find((x) => x.user_id === user.id);
      if (!p) return;
      p.grade = studentType;
      p.subjects = subjects;
      p.goals = goal;
      p.exams = exams.map((e) => `${e.title} (${e.date})`).join(", ");
      p.daily_hours = Math.max(0.5, Number(hours) || 1);
      p.onboarded = true;
    });
    for (const e of exams) {
      if (!e.title.trim() || !e.date) continue;
      createTask(user.id, {
        title: e.title.trim(),
        subject: subjects[0] ?? "General",
        date: e.date,
        time: "09:00",
        minutes: 120,
        priority: "high",
        is_exam: true,
      });
    }
    for (const a of deadlines) {
      if (!a.title.trim() || !a.date) continue;
      createTask(user.id, {
        title: a.title.trim(),
        subject: subjects[0] ?? "General",
        date: a.date,
        time: "18:00",
        minutes: 60,
        priority: "medium",
        is_exam: false,
      });
    }
    toast.success("Your semester is ready.");
    setDone(true);
  };

  if (done) {
    const nextExam = exams.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date))[0];
    const nextDeadline = deadlines.filter((d) => d.date).sort((a, b) => a.date.localeCompare(b.date))[0];
    return (
      <div className="min-h-screen bg-surface">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
          <Logo />
          <div className="panel mt-8 p-6 text-center sm:p-10">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft">
              <Sparkles className="size-7 text-brand" />
            </div>
            <h1 className="mt-5 text-3xl font-semibold">Your semester is ready.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We built your personalized dashboard around your {studentType.toLowerCase()} schedule.
            </p>
            <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Today's priority</p>
                <p className="mt-1.5 text-sm font-medium">
                  {nextDeadline ? `Start "${nextDeadline.title}"` : `Study ${subjects[0] ?? "your subjects"} for ${hours}h`}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Exam countdown</p>
                <p className="mt-1.5 text-sm font-medium">
                  {nextExam ? `${nextExam.title} — in ${daysUntil(nextExam.date)} day${daysUntil(nextExam.date) === 1 ? "" : "s"}` : "No exams added yet"}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Weekly plan</p>
                <p className="mt-1.5 text-sm font-medium">{hours}h per day · {subjects.length} subject{subjects.length === 1 ? "" : "s"}</p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Your goal</p>
                <p className="mt-1.5 text-sm font-medium">{goal}</p>
              </div>
            </div>
            <Button
              className="mt-8 bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => void navigate({ to: "/dashboard", replace: true })}
            >
              Open my dashboard <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Logo />
        <div className="panel mt-8 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Build my semester</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </p>
            </div>
            <div className="flex gap-1.5">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={cn("h-1.5 w-6 rounded-full", i <= step ? "bg-brand" : "bg-border")}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <div className="mt-7">
            {step === 0 && (
              <div className="space-y-3">
                <Label>What type of student are you?</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {STUDENT_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setStudentType(t)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                        studentType === t
                          ? "border-brand bg-brand-soft/50 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-brand/50",
                      )}
                    >
                      {t}
                      {studentType === t && <Check className="size-4 text-brand" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                <Label>What subjects or courses are you taking?</Label>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => toggle(s)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                        subjects.includes(s)
                          ? "border-brand bg-brand text-brand-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-brand/50",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <DatedList
                label="What are your upcoming exams?"
                hint="Add each exam with its date — you'll get a countdown on your dashboard."
                items={exams}
                setItems={setExams}
                placeholder="e.g. Biology midterm"
              />
            )}

            {step === 3 && (
              <DatedList
                label="What assignments or deadlines do you have?"
                hint="These become tasks in your planner with deadline reminders."
                items={deadlines}
                setItems={setDeadlines}
                placeholder="e.g. History essay"
              />
            )}

            {step === 4 && (
              <div className="space-y-3">
                <Label htmlFor="hours">How many hours can you realistically study each day?</Label>
                <Input
                  id="hours"
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className="max-w-32"
                />
                <p className="text-xs text-muted-foreground">Be honest — a realistic plan beats an ambitious one you can't keep.</p>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <Label>What is your main goal?</Label>
                <div className="grid gap-2">
                  {GOALS.map((g) => (
                    <button
                      type="button"
                      key={g}
                      onClick={() => setGoal(g)}
                      className={cn(
                        "flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                        goal === g
                          ? "border-brand bg-brand-soft/50 text-foreground"
                          : "border-border bg-card text-muted-foreground hover:border-brand/50",
                      )}
                    >
                      {g}
                      {goal === g && <Check className="size-4 text-brand" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                <ArrowLeft className="size-4" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                disabled={!canNext}
                onClick={() => setStep((s) => s + 1)}
                className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={!canNext}
                onClick={finish}
                className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                Build my semester <Sparkles className="size-4" />
              </Button>
            )}
            <Button type="button" variant="ghost" onClick={() => void navigate({ to: "/dashboard" })}>
              Skip for now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DatedList({
  label,
  hint,
  items,
  setItems,
  placeholder,
}: {
  label: string;
  hint: string;
  items: DatedItem[];
  setItems: (v: DatedItem[]) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={it.title}
              onChange={(e) => setItems(items.map((x, idx) => (idx === i ? { ...x, title: e.target.value } : x)))}
              placeholder={placeholder}
              className="flex-1"
            />
            <Input
              type="date"
              value={it.date}
              min={todayIso()}
              onChange={(e) => setItems(items.map((x, idx) => (idx === i ? { ...x, date: e.target.value } : x)))}
              className="w-40"
              aria-label="Date"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setItems(items.filter((_, idx) => idx !== i))}
              aria-label="Remove"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setItems([...items, { title: "", date: "" }])}
      >
        <CalendarDays className="size-4" /> Add another
      </Button>
    </div>
  );
}
