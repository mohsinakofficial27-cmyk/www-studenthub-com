import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your study profile — Student Hub" },
      { name: "description", content: "Tell Student Hub your year, subjects, goals and study hours." },
      { property: "og:title", content: "Set up your study profile — Student Hub" },
      { property: "og:description", content: "Personalise your Student Hub dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnboardingPage,
});

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

function OnboardingPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [grade, setGrade] = useState(profile?.grade ?? "");
  const [subjects, setSubjects] = useState<string[]>(profile?.subjects ?? []);
  const [goals, setGoals] = useState(profile?.goals ?? "");
  const [exams, setExams] = useState(profile?.exams ?? "");
  const [hours, setHours] = useState(String(profile?.daily_hours ?? 2));

  const toggle = (s: string) =>
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    mutate((d) => {
      const p = d.profiles.find((x) => x.user_id === user.id);
      if (!p) return;
      p.grade = grade.trim();
      p.subjects = subjects;
      p.goals = goals.trim();
      p.exams = exams.trim();
      p.daily_hours = Math.max(0.5, Number(hours) || 1);
      p.onboarded = true;
    });
    toast.success("Profile saved.");
    void navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Logo />
        <div className="panel mt-8 p-6 sm:p-8">
          <h1 className="text-2xl font-semibold">Let's personalise your hub</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This shapes your dashboard, planner and quiz suggestions. You can change it any time in your profile.
          </p>

          <form onSubmit={save} className="mt-7 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade / year</Label>
              <Input
                id="grade"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. Year 12, Grade 10, 1st year"
              />
            </div>

            <div className="space-y-2">
              <Label>Subjects</Label>
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

            <div className="space-y-2">
              <Label htmlFor="goals">Study goals</Label>
              <Textarea
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Lift my maths grade and revise consistently on weekdays."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="exams">Upcoming exams</Label>
              <Textarea
                id="exams"
                value={exams}
                onChange={(e) => setExams(e.target.value)}
                placeholder="e.g. Physics mock in May, Maths final in June."
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Add exact exam dates in the planner to get a countdown on your dashboard.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hours">Study hours per day</Label>
              <Input
                id="hours"
                type="number"
                min="0.5"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="max-w-32"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
                Save and open dashboard
              </Button>
              <Button type="button" variant="ghost" onClick={() => void navigate({ to: "/dashboard" })}>
                Skip for now
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
