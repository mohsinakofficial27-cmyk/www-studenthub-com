import { createFileRoute } from "@tanstack/react-router";
import { MoonStar } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/sleep-optimizer")({
  component: SleepOptimizerPage,
});

function dateAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function minutesBetween(start: string, end: string) {
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startValue = (startHour ?? 0) * 60 + (startMinute ?? 0);
  let endValue = (endHour ?? 0) * 60 + (endMinute ?? 0);
  if (endValue <= startValue) endValue += 24 * 60;
  return endValue - startValue;
}

function SleepOptimizerPage() {
  const [examDate, setExamDate] = useState(dateAfter(7));
  const [bedtime, setBedtime] = useState("22:30");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [focusMinutes, setFocusMinutes] = useState(25);
  const daysUntil = examDate
    ? Math.ceil((new Date(`${examDate}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 86_400_000)
    : Number.NaN;
  const sleepMinutes = minutesBetween(bedtime, wakeTime);
  const availableDays = Math.min(7, Math.max(0, daysUntil));
  const sessionsPerDay = sleepMinutes >= 8 * 60 ? 3 : 2;
  const blocks = Array.from({ length: availableDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const first = Number(wakeTime.slice(0, 2)) * 60 + Number(wakeTime.slice(3, 5)) + 120;
    return {
      label: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
      times: Array.from({ length: sessionsPerDay }, (_, block) => {
        const total = (first + block * 120) % (24 * 60);
        const hour = String(Math.floor(total / 60)).padStart(2, "0");
        const minute = String(total % 60).padStart(2, "0");
        return `${hour}:${minute}`;
      }),
    };
  });

  return (
    <AppShell title="Sleep & Study Cycle Optimizer" description="Build a realistic revision rhythm around your exam date and usual sleep schedule.">
      <InfoNote
        title="A planning aid, not medical advice"
        description="Study blocks and breaks are adjustable estimates, not biological predictions. Protect the sleep window that works for you; this tool does not diagnose or prescribe sleep."
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="panel h-fit space-y-4 p-5">
          <div className="space-y-2">
            <label htmlFor="exam-date" className="text-sm font-medium">Exam date</label>
            <Input id="exam-date" type="date" min={dateAfter(0)} value={examDate} onChange={(event) => setExamDate(event.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label htmlFor="bedtime" className="text-sm font-medium">Usual bedtime</label>
              <Input id="bedtime" type="time" value={bedtime} onChange={(event) => setBedtime(event.target.value)} />
            </div>
            <div className="space-y-2">
              <label htmlFor="wake-time" className="text-sm font-medium">Usual wake time</label>
              <Input id="wake-time" type="time" value={wakeTime} onChange={(event) => setWakeTime(event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="block-length" className="text-sm font-medium">Focus block</label>
            <select id="block-length" value={focusMinutes} onChange={(event) => setFocusMinutes(Number(event.target.value))} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value={25}>25 minutes + 5 minute break</option>
              <option value={50}>50 minutes + 10 minute break</option>
            </select>
          </div>
          <div className="rounded-xl bg-brand-soft/60 p-4">
            <p className="text-sm font-medium">Your sleep window</p>
            <p className="mt-1 text-2xl font-semibold">{Math.floor(sleepMinutes / 60)}h {sleepMinutes % 60}m</p>
            <p className="mt-1 text-xs text-muted-foreground">Based on the times you entered</p>
          </div>
        </section>

        <section className="panel p-5">
          <div className="flex items-center gap-2">
            <MoonStar className="size-5 text-brand" />
            <h2 className="text-lg font-semibold">Your next study blocks</h2>
          </div>
          {!Number.isFinite(daysUntil) ? (
            <p className="mt-4 rounded-xl bg-secondary p-4 text-sm">Choose an exam date to build a schedule.</p>
          ) : daysUntil < 0 ? (
            <p className="mt-4 rounded-xl bg-secondary p-4 text-sm">That exam date has passed. Choose an upcoming date to build a schedule.</p>
          ) : daysUntil === 0 ? (
            <p className="mt-4 rounded-xl bg-secondary p-4 text-sm">Your exam is today. Keep review light, take breaks, and follow your usual rest schedule.</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                {daysUntil} day{daysUntil === 1 ? "" : "s"} until exam · {focusMinutes}-minute focus blocks with a reset break
              </p>
              <ul className="mt-4 space-y-3">
                {blocks.map((day) => (
                  <li key={day.label} className="rounded-xl border border-border p-4">
                    <p className="font-medium">{day.label}</p>
                    <p className="mt-2 text-sm text-muted-foreground">Suggested starts: {day.times.join(" · ")}</p>
                  </li>
                ))}
              </ul>
              {daysUntil > 7 ? <p className="mt-3 text-xs text-muted-foreground">Showing the next 7 days; revisit the planner as your exam gets closer.</p> : null}
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
