import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, GraduationCap, ListChecks, MessageSquare, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useDb } from "@/lib/auth";
import { createCourse, deleteCourse, scopedRows, updateCourse } from "@/lib/data";
import { todayISO } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/courses")({
  head: () => ({
    meta: [
      { title: "Courses — Student Hub" },
      { name: "description", content: "Each course in one place: instructor, grade, exams, assignments and your notes." },
      { property: "og:title", content: "Courses — Student Hub" },
      { property: "og:description", content: "Your courses, assignments and exams in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoursesPage,
});

function CoursesPage() {
  const { user } = useAuth();
  const db = useDb();
  const [form, setForm] = useState({ name: "", instructor: "", credits: "3" });
  const [openId, setOpenId] = useState<string | null>(null);

  if (!user) return null;
  const courses = scopedRows(db.courses, user.id);
  const tasks = scopedRows(db.study_tasks, user.id);
  const notes = scopedRows(db.notes, user.id);
  const today = todayISO();

  const matches = (courseName: string, subject: string) =>
    subject.trim().toLowerCase() === courseName.trim().toLowerCase();

  const nextExam = (name: string) =>
    tasks
      .filter((t) => t.is_exam && !t.done && t.date >= today && matches(name, t.subject))
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const nextAssignment = (name: string) =>
    tasks
      .filter((t) => !t.is_exam && !t.done && t.date >= today && matches(name, t.subject))
      .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;
  const courseNotes = (name: string) => notes.filter((n) => matches(name, n.subject));
  const courseTasks = (name: string) =>
    tasks
      .filter((t) => matches(name, t.subject) && t.date >= today)
      .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
      .slice(0, 8);

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
      color: "#0e7c66",
    });
    setForm({ name: "", instructor: "", credits: "3" });
    toast.success("Course created. Tip: use the course name as the subject when you plan tasks or save notes.");
  };

  const fmtDate = (t: { date: string } | null) =>
    t
      ? new Date(`${t.date}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })
      : null;

  return (
    <AppShell title="Courses" description="Every course with its instructor, grade, exams, assignments and study material.">
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="panel p-5">
          {courses.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent py-10"
              icon={GraduationCap}
              title="No courses yet"
              description="Create your first course — its assignments and exams will show up here automatically as you plan them with the same subject name."
            />
          ) : (
            <ul className="space-y-3">
              {courses.map((c) => {
                const exam = nextExam(c.name);
                const assignment = nextAssignment(c.name);
                const linkedNotes = courseNotes(c.name);
                const linkedTasks = courseTasks(c.name);
                const open = openId === c.id;
                return (
                  <li key={c.id} className="rounded-2xl border border-border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(open ? null : c.id)}>
                        <p className="font-medium">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.instructor ? `${c.instructor} · ` : ""}
                          {c.credits} credits{c.grade ? ` · grade ${c.grade}` : ""}
                        </p>
                      </button>
                      <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => deleteCourse(c.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <p className="text-muted-foreground">Next exam</p>
                        <p className="mt-0.5 font-medium">{exam ? `${exam.title} · ${fmtDate(exam)}` : "None planned"}</p>
                      </div>
                      <div className="rounded-xl bg-surface px-3 py-2">
                        <p className="text-muted-foreground">Next assignment</p>
                        <p className="mt-0.5 font-medium">{assignment ? `${assignment.title} · ${fmtDate(assignment)}` : "None planned"}</p>
                      </div>
                    </div>

                    {open ? (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        <div className="flex flex-wrap gap-2">
                          <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
                            <Link to="/assistant"><MessageSquare className="size-3.5" /> Study with AI</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/quizzes"><ListChecks className="size-3.5" /> Quiz me</Link>
                          </Button>
                          <Button asChild size="sm" variant="outline">
                            <Link to="/planner"><CalendarDays className="size-3.5" /> Plan a session</Link>
                          </Button>
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Upcoming work</p>
                          {linkedTasks.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              Nothing scheduled for this course yet. Add tasks in the planner with “{c.name}” as the subject.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {linkedTasks.map((t) => (
                                <li key={t.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                                  <span>{t.title}{t.is_exam ? " · exam" : ""}</span>
                                  <span className="text-muted-foreground">{fmtDate(t)}{t.time ? ` · ${t.time}` : ""}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p>
                          {linkedNotes.length === 0 ? (
                            <p className="mt-1 text-sm text-muted-foreground">
                              No notes for this course yet. Save one in AI Notes with “{c.name}” as the subject.
                            </p>
                          ) : (
                            <ul className="mt-2 space-y-1.5">
                              {linkedNotes.slice(0, 5).map((n) => (
                                <li key={n.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                                  <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                                  <Link to="/notes" className="truncate hover:underline">{n.title}</Link>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label htmlFor={`nm-${c.id}`}>Rename course</Label>
                            <Input id={`nm-${c.id}`} value={c.name} onChange={(e) => updateCourse(c.id, { name: e.target.value })} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor={`in-${c.id}`}>Instructor</Label>
                            <Input id={`in-${c.id}`} value={c.instructor} onChange={(e) => updateCourse(c.id, { instructor: e.target.value })} />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <form onSubmit={add} className="panel h-fit space-y-4 p-5">
            <h2 className="text-lg font-semibold">New course</h2>
            <div className="space-y-2">
              <Label htmlFor="c-name">Course name</Label>
              <Input id="c-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Biology 101" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-inst">Instructor (optional)</Label>
              <Input id="c-inst" value={form.instructor} onChange={(e) => setForm({ ...form, instructor: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-credits">Credits</Label>
              <Input id="c-credits" type="number" min="0" step="0.5" value={form.credits} onChange={(e) => setForm({ ...form, credits: e.target.value })} />
            </div>
            <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">Create course</Button>
            <p className="text-xs text-muted-foreground">
              Courses link up automatically: tasks and notes whose subject matches the course name appear on its page, and grades feed the GPA Center.
            </p>
          </form>
          <Button asChild variant="outline" className="w-full">
            <Link to="/gpa">Open GPA Center</Link>
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
