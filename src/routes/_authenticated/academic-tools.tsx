import { createFileRoute } from "@tanstack/react-router";
import {
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  Copy,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import { cloneElement, useState, type FormEvent, type ReactElement } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useDb } from "@/lib/auth";
import { localDateKey, mutate, todayISO, uid } from "@/lib/store";
import type {
  ApplicationRow,
  ApplicationStatus,
  BudgetProfileRow,
  ExamRoadmapRow,
  ExamTopic,
  ResearchSourceRow,
  RubricCriterion,
  RubricRow,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/academic-tools")({
  head: () => ({
    meta: [
      { title: "Academic Toolkit — Student Hub" },
      {
        name: "description",
        content:
          "Plan exam revision, track rubrics and applications, organize citations, and manage a student budget.",
      },
    ],
  }),
  component: AcademicToolsPage,
});

const nowIso = () => new Date().toISOString();
const statuses: ApplicationStatus[] = [
  "researching",
  "preparing",
  "submitted",
  "accepted",
  "rejected",
  "waitlisted",
];

function AcademicToolsPage() {
  const { user } = useAuth();
  const db = useDb();
  const [tab, setTab] = useState("roadmap");
  if (!user) return null;

  const rubrics = db.assignment_rubrics.filter((row) => row.user_id === user.id);
  const roadmaps = db.exam_roadmaps.filter((row) => row.user_id === user.id);
  const sources = db.research_sources.filter((row) => row.user_id === user.id);
  const applications = db.applications.filter((row) => row.user_id === user.id);
  const budgetPlan = db.budget_profiles.find((row) => row.user_id === user.id);
  const expenses = db.budget_entries.filter((row) => row.user_id === user.id);

  return (
    <AppShell
      title="Academic Toolkit"
      description="Turn upcoming exams, assignments, research, applications, and student finances into manageable plans."
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="roadmap">Exam roadmap</TabsTrigger>
          <TabsTrigger value="rubric">Assignment rubrics</TabsTrigger>
          <TabsTrigger value="sources">Sources & citations</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="budget">Student budget</TabsTrigger>
        </TabsList>
        <TabsContent value="roadmap">
          <RoadmapPanel userId={user.id} rows={roadmaps} />
        </TabsContent>
        <TabsContent value="rubric">
          <RubricPanel userId={user.id} rows={rubrics} />
        </TabsContent>
        <TabsContent value="sources">
          <SourcesPanel userId={user.id} rows={sources} />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsPanel userId={user.id} rows={applications} />
        </TabsContent>
        <TabsContent value="budget">
          <BudgetPanel userId={user.id} plan={budgetPlan} expenses={expenses} />
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function RoadmapPanel({ userId, rows }: { userId: string; rows: ExamRoadmapRow[] }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [minutes, setMinutes] = useState("45");
  const [topicsInput, setTopicsInput] = useState("");

  const createRoadmap = (event: FormEvent) => {
    event.preventDefault();
    const topics = topicsInput
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!title.trim() || !subject.trim() || !examDate || !topics.length) {
      toast.error("Add an exam, subject, future date, and at least one topic.");
      return;
    }
    if (examDate < todayISO()) {
      toast.error("The exam date must be today or later.");
      return;
    }
    const dailyMinutes = Number(minutes);
    if (!Number.isInteger(dailyMinutes) || dailyMinutes < 5 || dailyMinutes > 720) {
      toast.error("Daily study time must be between 5 and 720 minutes.");
      return;
    }
    const end = new Date(`${examDate}T12:00:00`);
    const studyDays: string[] = [];
    for (
      let cursor = new Date(`${todayISO()}T12:00:00`);
      cursor <= end;
      cursor.setDate(cursor.getDate() + 1)
    ) {
      studyDays.push(localDateKey(cursor));
      if (studyDays.length > 366) {
        toast.error("Choose an exam date within the next year to create a roadmap.");
        return;
      }
    }
    const parsed: ExamTopic[] = topics.map((value) => ({
      id: uid(),
      title: value,
      difficulty: "medium",
      done: false,
      study_date: "",
    }));
    parsed.forEach((topic, index) => {
      topic.study_date = studyDays[index % studyDays.length] ?? examDate;
    });
    const now = nowIso();
    const row: ExamRoadmapRow = {
      id: uid(),
      user_id: userId,
      exam_title: title.trim(),
      subject: subject.trim(),
      exam_date: examDate,
      daily_minutes: dailyMinutes,
      topics: parsed,
      created_at: now,
      updated_at: now,
    };
    mutate((data) => data.exam_roadmaps.unshift(row));
    setTitle("");
    setSubject("");
    setExamDate("");
    setTopicsInput("");
    toast.success("Revision roadmap created.");
  };

  const updateTopic = (roadmap: ExamRoadmapRow, topicId: string, patch: Partial<ExamTopic>) =>
    mutate((data) => {
      const current = data.exam_roadmaps.find(
        (row) => row.id === roadmap.id && row.user_id === userId,
      );
      if (!current) return;
      current.topics = current.topics.map((topic) =>
        topic.id === topicId ? { ...topic, ...patch } : topic,
      );
      current.updated_at = nowIso();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
      <form className="panel h-fit space-y-4 p-5" onSubmit={createRoadmap}>
        <div>
          <h2 className="text-lg font-semibold">Build an exam revision roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Topics are distributed across the available days, starting today.
          </p>
        </div>
        <Field label="Exam name">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
        <Field label="Subject">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} required />
        </Field>
        <Field label="Exam date">
          <Input
            type="date"
            min={todayISO()}
            value={examDate}
            onChange={(event) => setExamDate(event.target.value)}
            required
          />
        </Field>
        <Field label="Daily study time (minutes)">
          <Input
            type="number"
            min={5}
            max={720}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            required
          />
        </Field>
        <Field label="Topics (one per line)">
          <Textarea
            rows={5}
            value={topicsInput}
            onChange={(event) => setTopicsInput(event.target.value)}
            placeholder={"Cell structure\nGenetics\nEvolution"}
            required
          />
        </Field>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          Create roadmap
        </Button>
      </form>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <EmptyPanel icon={CalendarClock} text="Your exam roadmaps will appear here." />
        ) : null}
        {rows.map((row) => {
          const complete = row.topics.filter((topic) => topic.done).length;
          return (
            <section key={row.id} className="panel space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{row.exam_title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {row.subject} · Exam {row.exam_date} · {row.daily_minutes} min/day
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.exam_title} roadmap`}
                  onClick={() =>
                    mutate((data) => {
                      data.exam_roadmaps = data.exam_roadmaps.filter((item) => item.id !== row.id);
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {complete} of {row.topics.length} topics complete
              </p>
              <ul className="space-y-2">
                {row.topics.map((topic) => (
                  <li
                    key={topic.id}
                    className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                  >
                    <Checkbox
                      checked={topic.done}
                      onCheckedChange={(checked) =>
                        updateTopic(row, topic.id, { done: Boolean(checked) })
                      }
                      aria-label={`Mark ${topic.title} complete`}
                    />
                    <span
                      className={`min-w-0 flex-1 text-sm ${topic.done ? "text-muted-foreground line-through" : ""}`}
                    >
                      {topic.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{topic.study_date}</span>
                    <select
                      aria-label={`Difficulty for ${topic.title}`}
                      className="max-w-24 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      value={topic.difficulty}
                      onChange={(event) =>
                        updateTopic(row, topic.id, {
                          difficulty: event.target.value as ExamTopic["difficulty"],
                        })
                      }
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function RubricPanel({ userId, rows }: { userId: string; rows: RubricRow[] }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [criterion, setCriterion] = useState("");
  const [weight, setWeight] = useState("100");
  const [score, setScore] = useState("0");

  const createRubric = (event: FormEvent) => {
    event.preventDefault();
    const numericWeight = Number(weight);
    const numericScore = Number(score);
    if (!title.trim() || !subject.trim() || !criterion.trim()) {
      toast.error("Add an assignment, subject, and at least one rubric criterion.");
      return;
    }
    if (
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0 ||
      numericWeight > 100 ||
      !Number.isFinite(numericScore) ||
      numericScore < 0 ||
      numericScore > 100
    ) {
      toast.error("Criterion weight and score must be between 0 and 100; weight cannot be zero.");
      return;
    }
    const now = nowIso();
    const row: RubricRow = {
      id: uid(),
      user_id: userId,
      task_id: "",
      title: title.trim(),
      subject: subject.trim(),
      criteria: [
        {
          id: uid(),
          title: criterion.trim(),
          description: "",
          weight: numericWeight,
          score: numericScore,
          notes: "",
        },
      ],
      created_at: now,
      updated_at: now,
    };
    mutate((data) => data.assignment_rubrics.unshift(row));
    setTitle("");
    setSubject("");
    setCriterion("");
    setWeight("100");
    setScore("0");
    toast.success("Assignment rubric saved.");
  };

  const patchCriterion = (rowId: string, criterionId: string, patch: Partial<RubricCriterion>) =>
    mutate((data) => {
      const row = data.assignment_rubrics.find(
        (item) => item.id === rowId && item.user_id === userId,
      );
      if (!row) return;
      row.criteria = row.criteria.map((item) =>
        item.id === criterionId ? { ...item, ...patch } : item,
      );
      row.updated_at = nowIso();
    });

  const addCriterion = (row: RubricRow) => {
    const next = window.prompt("Criterion name");
    if (!next?.trim()) return;
    mutate((data) => {
      const current = data.assignment_rubrics.find(
        (item) => item.id === row.id && item.user_id === userId,
      );
      if (!current) return;
      current.criteria.push({
        id: uid(),
        title: next.trim(),
        description: "",
        weight: 1,
        score: 0,
        notes: "",
      });
      current.updated_at = nowIso();
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
      <form className="panel h-fit space-y-4 p-5" onSubmit={createRubric}>
        <div>
          <h2 className="text-lg font-semibold">Track an assignment rubric</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record criteria and scores; weighted results update as you edit.
          </p>
        </div>
        <Field label="Assignment">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
        <Field label="Subject">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} required />
        </Field>
        <Field label="First criterion">
          <Input
            value={criterion}
            onChange={(event) => setCriterion(event.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight (%)">
            <Input
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              required
            />
          </Field>
          <Field label="Score (%)">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              required
            />
          </Field>
        </div>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          Save rubric
        </Button>
      </form>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <EmptyPanel icon={ClipboardList} text="Your assignment rubrics will appear here." />
        ) : null}
        {rows.map((row) => {
          const totalWeight = row.criteria.reduce((sum, item) => sum + item.weight, 0);
          const weighted = totalWeight
            ? row.criteria.reduce((sum, item) => sum + item.weight * item.score, 0) / totalWeight
            : 0;
          return (
            <section key={row.id} className="panel space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{row.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {row.subject} · Weighted score: {weighted.toFixed(1)}%
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${row.title} rubric`}
                  onClick={() =>
                    mutate((data) => {
                      data.assignment_rubrics = data.assignment_rubrics.filter(
                        (item) => item.id !== row.id,
                      );
                    })
                  }
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {row.criteria.map((item) => (
                <div
                  key={item.id}
                  className="grid items-center gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_100px_100px]"
                >
                  <span className="text-sm">{item.title}</span>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Weight %
                    <Input
                      aria-label={`${item.title} weight percent`}
                      type="number"
                      min={0.1}
                      max={100}
                      step={0.1}
                      value={item.weight}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next) && next > 0 && next <= 100)
                          patchCriterion(row.id, item.id, { weight: next });
                      }}
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    Score %
                    <Input
                      aria-label={`${item.title} score percent`}
                      type="number"
                      min={0}
                      max={100}
                      step={0.1}
                      value={item.score}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        if (Number.isFinite(next) && next >= 0 && next <= 100)
                          patchCriterion(row.id, item.id, { score: next });
                      }}
                    />
                  </label>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addCriterion(row)}>
                <Plus className="me-1 size-4" /> Add criterion
              </Button>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SourcesPanel({ userId, rows }: { userId: string; rows: ResearchSourceRow[] }) {
  const [title, setTitle] = useState("");
  const [authors, setAuthors] = useState("");
  const [year, setYear] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");

  const addSource = (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Enter a source title.");
      return;
    }
    if (url.trim()) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        toast.error("Enter a valid http or https source URL.");
        return;
      }
    }
    const now = nowIso();
    const row: ResearchSourceRow = {
      id: uid(),
      user_id: userId,
      title: title.trim(),
      authors: authors.trim(),
      published_at: year.trim(),
      url: url.trim(),
      category: category.trim(),
      notes: notes.trim(),
      tags: [],
      created_at: now,
      updated_at: now,
    };
    mutate((data) => data.research_sources.unshift(row));
    setTitle("");
    setAuthors("");
    setYear("");
    setUrl("");
    setCategory("");
    setNotes("");
    toast.success("Source saved.");
  };

  const copyCitation = async (row: ResearchSourceRow, style: "APA" | "MLA") => {
    const author = row.authors.trim();
    const date = row.published_at.trim() || "n.d.";
    const urlPart = row.url ? ` ${row.url}` : "";
    const citation =
      style === "APA"
        ? `${author ? `${author}. ` : ""}(${date}). ${row.title}.${urlPart}`
        : `${author ? `${author}. ` : ""}"${row.title}." ${date}.${urlPart}`;
    try {
      await navigator.clipboard.writeText(citation);
      toast.success(
        `${style} citation copied. Verify the formatting against your institution's requirements.`,
      );
    } catch {
      toast.error("Could not access the clipboard. Check browser permissions and try again.");
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
      <form className="panel h-fit space-y-4 p-5" onSubmit={addSource}>
        <div>
          <h2 className="text-lg font-semibold">Organize a research source</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Citations use only the details you enter. Review them before submitting academic work.
          </p>
        </div>
        <Field label="Title">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
        <Field label="Author(s)">
          <Input
            value={authors}
            onChange={(event) => setAuthors(event.target.value)}
            placeholder="As shown in the source"
          />
        </Field>
        <Field label="Publication year or date">
          <Input
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="2025"
          />
        </Field>
        <Field label="Source URL">
          <Input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </Field>
        <Field label="Category">
          <Input
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Journal article, book, website…"
          />
        </Field>
        <Field label="Research notes">
          <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          Save source
        </Button>
      </form>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <EmptyPanel
            icon={BookOpenCheck}
            text="Saved sources and citation tools will appear here."
          />
        ) : null}
        {rows.map((row) => (
          <article key={row.id} className="panel space-y-3 p-5">
            <div className="flex justify-between gap-3">
              <div>
                <h3 className="font-semibold">{row.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {row.authors || "Author not provided"} · {row.published_at || "Date not provided"}
                  {row.category ? ` · ${row.category}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${row.title}`}
                onClick={() =>
                  mutate((data) => {
                    data.research_sources = data.research_sources.filter(
                      (item) => item.id !== row.id,
                    );
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            {row.url ? (
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm text-accent-foreground underline"
              >
                {row.url}
              </a>
            ) : null}
            {row.notes ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.notes}</p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void copyCitation(row, "APA")}>
                <Copy className="me-1 size-4" /> APA
              </Button>
              <Button variant="outline" size="sm" onClick={() => void copyCitation(row, "MLA")}>
                <Copy className="me-1 size-4" /> MLA
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ApplicationsPanel({ userId, rows }: { userId: string; rows: ApplicationRow[] }) {
  const [kind, setKind] = useState<ApplicationRow["kind"]>("university");
  const [institution, setInstitution] = useState("");
  const [program, setProgram] = useState("");
  const [deadline, setDeadline] = useState("");
  const [url, setUrl] = useState("");
  const [requirements, setRequirements] = useState("");
  const [notes, setNotes] = useState("");

  const addApplication = (event: FormEvent) => {
    event.preventDefault();
    if (!institution.trim()) {
      toast.error("Enter a university or scholarship name.");
      return;
    }
    if (url.trim()) {
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
      } catch {
        toast.error("Enter a valid http or https application URL.");
        return;
      }
    }
    const now = nowIso();
    const row: ApplicationRow = {
      id: uid(),
      user_id: userId,
      kind,
      institution: institution.trim(),
      program: program.trim(),
      deadline: deadline || null,
      status: "researching",
      requirements: requirements
        .split(/\n/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({ id: uid(), title: text, done: false })),
      notes: notes.trim(),
      url: url.trim(),
      created_at: now,
      updated_at: now,
    };
    mutate((data) => data.applications.unshift(row));
    setInstitution("");
    setProgram("");
    setDeadline("");
    setUrl("");
    setRequirements("");
    setNotes("");
    toast.success("Application tracker added.");
  };

  const updateRow = (id: string, update: (row: ApplicationRow) => void) =>
    mutate((data) => {
      const row = data.applications.find((item) => item.id === id && item.user_id === userId);
      if (!row) return;
      update(row);
      row.updated_at = nowIso();
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
      <form className="panel h-fit space-y-4 p-5" onSubmit={addApplication}>
        <div>
          <h2 className="text-lg font-semibold">Track an opportunity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep deadlines, requirements, links, and application status together.
          </p>
        </div>
        <Field label="Type">
          <select
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={kind}
            onChange={(event) => setKind(event.target.value as ApplicationRow["kind"])}
          >
            <option value="university">University</option>
            <option value="scholarship">Scholarship</option>
          </select>
        </Field>
        <Field label="University / scholarship">
          <Input
            value={institution}
            onChange={(event) => setInstitution(event.target.value)}
            required
          />
        </Field>
        <Field label="Program / award">
          <Input value={program} onChange={(event) => setProgram(event.target.value)} />
        </Field>
        <Field label="Deadline">
          <Input
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </Field>
        <Field label="Official application URL">
          <Input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://"
          />
        </Field>
        <Field label="Requirements (one per line)">
          <Textarea
            rows={4}
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
            placeholder={"Transcript\nRecommendation letter\nPersonal statement"}
          />
        </Field>
        <Field label="Notes">
          <Textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
        <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
          Add tracker
        </Button>
      </form>
      <div className="space-y-3">
        {rows.length === 0 ? (
          <EmptyPanel
            icon={GraduationCap}
            text="University and scholarship trackers will appear here."
          />
        ) : null}
        {rows.map((row) => (
          <section key={row.id} className="panel space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase text-muted-foreground">{row.kind}</p>
                <h3 className="font-semibold">{row.institution}</h3>
                <p className="text-sm text-muted-foreground">
                  {row.program || "Program not specified"}
                  {row.deadline ? ` · Deadline ${row.deadline}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete ${row.institution} tracker`}
                onClick={() =>
                  mutate((data) => {
                    data.applications = data.applications.filter((item) => item.id !== row.id);
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Field label="Status">
              <select
                aria-label={`Status for ${row.institution}`}
                className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                value={row.status}
                onChange={(event) =>
                  updateRow(row.id, (current) => {
                    current.status = event.target.value as ApplicationStatus;
                  })
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </Field>
            {row.url ? (
              <a
                href={row.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-sm text-accent-foreground underline"
              >
                Open official application
              </a>
            ) : null}
            {row.requirements.length ? (
              <ul className="space-y-2">
                {row.requirements.map((requirement) => (
                  <li key={requirement.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={requirement.done}
                      onCheckedChange={(checked) =>
                        updateRow(row.id, (current) => {
                          current.requirements = current.requirements.map((item) =>
                            item.id === requirement.id ? { ...item, done: Boolean(checked) } : item,
                          );
                        })
                      }
                      aria-label={`Mark ${requirement.title} complete`}
                    />
                    <span className={requirement.done ? "line-through text-muted-foreground" : ""}>
                      {requirement.title}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {row.notes ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.notes}</p>
            ) : null}
          </section>
        ))}
      </div>
    </div>
  );
}

function BudgetPanel({
  userId,
  plan,
  expenses,
}: {
  userId: string;
  plan: BudgetProfileRow | undefined;
  expenses: {
    id: string;
    user_id: string;
    category: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
    created_at: string;
  }[];
}) {
  const [currency, setCurrency] = useState(plan?.currency ?? "USD");
  const [income, setIncome] = useState(String(plan?.monthly_income ?? 0));
  const [limit, setLimit] = useState(String(plan?.monthly_limit ?? 0));
  const [savings, setSavings] = useState(String(plan?.savings_goal ?? 0));
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const month = todayISO().slice(0, 7);
  const monthExpenses = expenses.filter((item) => item.date.startsWith(month));
  const total = monthExpenses
    .filter((item) => item.currency === currency)
    .reduce((sum, item) => sum + item.amount, 0);
  const formatMoney = (value: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency }).format(value);

  const savePlan = (event: FormEvent) => {
    event.preventDefault();
    const values = [income, limit, savings].map(Number);
    if (!values.every((value) => Number.isFinite(value) && value >= 0)) {
      toast.error("Income, monthly limit, and savings target must be valid non-negative amounts.");
      return;
    }
    const row: BudgetProfileRow = {
      user_id: userId,
      currency,
      monthly_income: values[0]!,
      monthly_limit: values[1]!,
      savings_goal: values[2]!,
      updated_at: nowIso(),
    };
    mutate((data) => {
      const current = data.budget_profiles.find((item) => item.user_id === userId);
      if (current) Object.assign(current, row);
      else data.budget_profiles.push(row);
    });
    toast.success("Monthly budget saved.");
  };

  const addExpense = (event: FormEvent) => {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!category.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || !date) {
      toast.error("Enter a category, valid positive amount, and date.");
      return;
    }
    mutate((data) =>
      data.budget_entries.unshift({
        id: uid(),
        user_id: userId,
        category: category.trim(),
        amount: numericAmount,
        currency,
        date,
        description: description.trim(),
        created_at: nowIso(),
      }),
    );
    setCategory("");
    setAmount("");
    setDescription("");
    toast.success("Expense recorded.");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <form className="panel space-y-4 p-5" onSubmit={savePlan}>
          <div>
            <h2 className="text-lg font-semibold">Monthly plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Budget data is private to your account and is not financial advice.
            </p>
          </div>
          <Field label="Currency">
            <select
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              {["USD", "PKR", "EUR", "GBP", "INR", "CAD", "AUD"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Monthly income">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={income}
              onChange={(event) => setIncome(event.target.value)}
            />
          </Field>
          <Field label="Monthly spending limit">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
          </Field>
          <Field label="Monthly savings goal">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={savings}
              onChange={(event) => setSavings(event.target.value)}
            />
          </Field>
          <Button type="submit" variant="outline">
            Save monthly plan
          </Button>
        </form>
        <form className="panel space-y-4 p-5" onSubmit={addExpense}>
          <h2 className="text-lg font-semibold">Record a student expense</h2>
          <Field label="Category">
            <Input
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Books, transport, food…"
              required
            />
          </Field>
          <Field label={`Amount (${currency})`}>
            <Input
              type="number"
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(event) => setDescription(event.target.value)} />
          </Field>
          <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
            Add expense
          </Button>
        </form>
      </div>
      <section className="panel h-fit space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">This month</h2>
          <p className="text-sm text-muted-foreground">{month}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Totals include only expenses in {currency}; amounts in other currencies are not
            converted.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Metric label="Spent" value={formatMoney(total)} />
          <Metric
            label="Remaining limit"
            value={formatMoney(Math.max(0, (plan?.monthly_limit ?? 0) - total))}
          />
          <Metric label="Income" value={formatMoney(plan?.monthly_income ?? 0)} />
          <Metric label="Savings goal" value={formatMoney(plan?.savings_goal ?? 0)} />
        </div>
        <div className="space-y-2">
          {monthExpenses.length === 0 ? (
            <p className="py-5 text-center text-sm text-muted-foreground">
              No expenses recorded this month.
            </p>
          ) : null}
          {monthExpenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {expense.description || expense.category}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expense.category} · {expense.date}
                </p>
              </div>
              <span className="text-sm font-medium">
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: expense.currency,
                }).format(expense.amount)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete expense ${expense.description || expense.category}`}
                onClick={() =>
                  mutate((data) => {
                    data.budget_entries = data.budget_entries.filter(
                      (item) => item.id !== expense.id,
                    );
                  })
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = `academic-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
    </div>
  );
}

function EmptyPanel({ icon: Icon, text }: { icon: typeof CalendarClock; text: string }) {
  return (
    <div className="panel flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
