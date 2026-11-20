import { Link, createFileRoute } from "@tanstack/react-router";
import { GraduationCap, Target, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useDb } from "@/lib/auth";
import {
  computeGpa,
  createCourse,
  deleteCourse,
  finalExamNeeded,
  gradePoints,
  gradeOptionsForSystem,
  maximumGradePoints,
  scopedRows,
  updateCourse,
} from "@/lib/data";
import { selectClass } from "@/lib/ui";

export const Route = createFileRoute("/_authenticated/gpa")({
  head: () => ({
    meta: [
      { title: "GPA Center — Student Hub" },
      {
        name: "description",
        content:
          "Track course grades and credits, calculate your GPA and see what you need on your final.",
      },
      { property: "og:title", content: "GPA Center — Student Hub" },
      { property: "og:description", content: "Your grades, credits and GPA in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GpaPage,
});

function GpaPage() {
  const { user } = useAuth();
  const db = useDb();
  const [form, setForm] = useState({
    name: "",
    instructor: "",
    credits: "3",
    grade: "",
    target: "",
  });
  const [finalCalc, setFinalCalc] = useState({ current: "", weight: "40", target: "80" });

  if (!user) return null;
  const gradingSystem =
    db.user_settings.find((row) => row.user_id === user.id)?.grading_system ?? "gpa4";
  const gradeOptions = gradeOptionsForSystem(gradingSystem);
  const maxGradePoints = maximumGradePoints(gradingSystem);
  const courses = scopedRows(db.courses, user.id);
  const gpa = computeGpa(courses, gradingSystem);
  const graded = courses.filter((c) => gradePoints(c.grade, gradingSystem) !== null);
  const totalCredits = graded.reduce((s, c) => s + c.credits, 0);
  const targetGpa = computeGpa(
    courses.filter((c) => c.target_grade).map((c) => ({ ...c, grade: c.target_grade })),
    gradingSystem,
  );
  // What average grade is needed across ungraded credits to reach the target GPA?
  const ungradedCredits = courses.reduce((s, c) => s + c.credits, 0) - totalCredits;
  let neededAvg: number | null = null;
  if (gpa !== null && targetGpa !== null && ungradedCredits > 0) {
    const currentPoints = graded.reduce(
      (s, c) => s + (gradePoints(c.grade, gradingSystem) ?? 0) * c.credits,
      0,
    );
    neededAvg = Math.round(
      (((targetGpa * (totalCredits + ungradedCredits) - currentPoints) / ungradedCredits) * 100) /
        100,
    );
    if (neededAvg > maxGradePoints) neededAvg = -1;
  }

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Give the course a name.");
      return;
    }
    createCourse(user.id, {
      name: form.name,
      instructor: form.instructor,
      credits: Number(form.credits) || 3,
      grade: form.grade,
      target_grade: form.target,
      color: "#0e7c66",
    });
    setForm({ name: "", instructor: "", credits: "3", grade: "", target: "" });
    toast.success("Course added.");
  };

  const finalNeed = finalExamNeeded(
    Number(finalCalc.current) || 0,
    (Number(finalCalc.weight) || 0) / 100,
    Number(finalCalc.target) || 0,
  );

  return (
    <AppShell
      title="GPA Center"
      description="Your course grades, credits and GPA — all estimates are based on what you enter."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {gradingSystem === "percentage" ? "Current percentage average" : "Current GPA"}
          </p>
          <p className="mt-2 text-3xl font-semibold">{gpa !== null ? gpa.toFixed(2) : "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {graded.length
              ? `${graded.length} graded course${graded.length === 1 ? "" : "s"} · ${totalCredits} credits`
              : "Add grades to your courses"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {gradingSystem === "percentage" ? "Target percentage" : "Target GPA"}
          </p>
          <p className="mt-2 text-3xl font-semibold">
            {targetGpa !== null ? targetGpa.toFixed(2) : "—"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Set a target grade on each course</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            To reach your target
          </p>
          {neededAvg === null ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Add graded and ungraded courses with a target set.
            </p>
          ) : neededAvg === -1 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              This target is above a {maxGradePoints.toFixed(1)}{" "}
              {gradingSystem === "percentage" ? "average" : "scale"} — adjust it to reach it more
              realistically.
            </p>
          ) : (
            <p className="mt-2 text-sm">
              You need about <span className="font-semibold">{neededAvg.toFixed(2)}</span>{" "}
              {gradingSystem === "percentage" ? "average" : "GPA average"} across your{" "}
              {ungradedCredits} ungraded credit{ungradedCredits === 1 ? "" : "s"}.
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Educational estimate based on your entries.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Courses</h2>
          {courses.length === 0 ? (
            <EmptyState
              className="mt-4 border-0 bg-transparent py-10"
              icon={GraduationCap}
              title="No courses yet"
              description="Add each course with its credits — then set the grade you have and the grade you're aiming for."
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {courses.map((c) => (
                <li key={c.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{c.name}</p>
                      {c.instructor ? (
                        <p className="text-xs text-muted-foreground">{c.instructor}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${c.name}`}
                      onClick={() => deleteCourse(c.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label htmlFor={`cr-${c.id}`}>Credits</Label>
                      <Input
                        id={`cr-${c.id}`}
                        type="number"
                        min="0"
                        step="0.5"
                        value={c.credits}
                        onChange={(e) =>
                          updateCourse(c.id, { credits: Number(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`gr-${c.id}`}>Current grade</Label>
                      <select
                        id={`gr-${c.id}`}
                        className={selectClass}
                        value={c.grade}
                        onChange={(e) => updateCourse(c.id, { grade: e.target.value })}
                      >
                        <option value="">Not graded</option>
                        {c.grade && !gradeOptions.includes(c.grade) ? (
                          <option key={`saved-${c.grade}`} value={c.grade}>
                            {c.grade} (saved; other scale)
                          </option>
                        ) : null}
                        {gradeOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`tg-${c.id}`}>Target grade</Label>
                      <select
                        id={`tg-${c.id}`}
                        className={selectClass}
                        value={c.target_grade}
                        onChange={(e) => updateCourse(c.id, { target_grade: e.target.value })}
                      >
                        <option value="">None</option>
                        {c.target_grade && !gradeOptions.includes(c.target_grade) ? (
                          <option key={`saved-${c.target_grade}`} value={c.target_grade}>
                            {c.target_grade} (saved; other scale)
                          </option>
                        ) : null}
                        {gradeOptions.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground">
                        {gradePoints(c.grade, gradingSystem) !== null
                          ? `${gradePoints(c.grade, gradingSystem)?.toFixed(1)} ${gradingSystem === "percentage" ? "%" : "grade points"}`
                          : "Awaiting grade"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 rounded-2xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-warning" /> What do I need on my final?
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="fc-current">Current average %</Label>
                <Input
                  id="fc-current"
                  type="number"
                  min="0"
                  max="100"
                  value={finalCalc.current}
                  onChange={(e) => setFinalCalc({ ...finalCalc, current: e.target.value })}
                  placeholder="e.g. 78"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fc-weight">Final worth %</Label>
                <Input
                  id="fc-weight"
                  type="number"
                  min="1"
                  max="100"
                  value={finalCalc.weight}
                  onChange={(e) => setFinalCalc({ ...finalCalc, weight: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fc-target">Wanted overall %</Label>
                <Input
                  id="fc-target"
                  type="number"
                  min="0"
                  max="100"
                  value={finalCalc.target}
                  onChange={(e) => setFinalCalc({ ...finalCalc, target: e.target.value })}
                />
              </div>
            </div>
            {finalCalc.current === "" ? null : finalNeed === null ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Enter your current average to see the estimate.
              </p>
            ) : finalNeed > 100 ? (
              <p className="mt-3 text-sm">
                That overall isn't reachable with these numbers — try a slightly lower target.
              </p>
            ) : finalNeed <= 0 ? (
              <p className="mt-3 text-sm">
                Good news — you've already secured this overall before the final.
              </p>
            ) : (
              <p className="mt-3 text-sm">
                You need approximately <span className="font-semibold">{finalNeed}%</span> on your
                final. Estimate based on the numbers you entered.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <form onSubmit={add} className="panel h-fit space-y-4 p-5">
            <h2 className="text-lg font-semibold">Add a course</h2>
            <div className="space-y-2">
              <Label htmlFor="cname">Course name</Label>
              <Input
                id="cname"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Biology 101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cinst">Instructor (optional)</Label>
              <Input
                id="cinst"
                value={form.instructor}
                onChange={(e) => setForm({ ...form, instructor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccredits">Credits</Label>
              <Input
                id="ccredits"
                type="number"
                min="0"
                step="0.5"
                value={form.credits}
                onChange={(e) => setForm({ ...form, credits: e.target.value })}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
            >
              Add course
            </Button>
          </form>
          <InfoNote
            title="How GPA is calculated"
            description={
              gradingSystem === "percentage"
                ? "Weighted average of the percentages you enter. Percentage-to-letter conversions vary by institution, so no conversion is assumed."
                : gradingSystem === "uk"
                  ? "UK degree classifications use an approximate 4.0 equivalent for planning only; universities use different rules. Check your institution's official scale."
                  : `Grades are weighted by course credits using your selected ${maxGradePoints.toFixed(1)}-point scale. Grade conversions vary by institution, so treat this as an estimate and use your school's official scale.`
            }
          />
          <Button asChild variant="outline" className="w-full">
            <Link to="/courses">Open course pages</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
