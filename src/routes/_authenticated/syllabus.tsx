import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, FileUp, Loader2, ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { parseSyllabusAI } from "@/lib/ai.functions";
import { isAiSetupIssue } from "@/lib/ai";
import { useAuth, useDb } from "@/lib/auth";
import { createCourse, createTask, scopedRows } from "@/lib/data";
import { todayISO } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/syllabus")({
  head: () => ({
    meta: [
      { title: "Syllabus Scanner — Student Hub" },
      { name: "description", content: "Upload your syllabus and the AI turns it into courses, assignments and exams in your planner." },
      { property: "og:title", content: "Syllabus Scanner — Student Hub" },
      { property: "og:description", content: "Upload your syllabus — Student Hub organizes your semester." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SyllabusPage,
});

type ExtractedCourse = { name: string; instructor: string };
type ExtractedItem = { kind: "assignment" | "exam" | "project"; title: string; course: string; date: string; priority: "low" | "medium" | "high" };

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).href;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 15); i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => ("str" in it ? it.str : "")).join(" "));
  }
  return pages.join("\n").replace(/\s+/g, " ").trim();
}

function SyllabusPage() {
  const { user } = useAuth();
  const db = useDb();
  const fileRef = useRef<HTMLInputElement>(null);
  // Image (if any) is kept in a ref — never rendered, only its data URL
  // travels with the scan request to the server-side AI.
  const imageRef = useRef("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ courses: ExtractedCourse[]; items: ExtractedItem[] } | null>(null);
  const [pickedCourses, setPickedCourses] = useState<Set<number>>(new Set());
  const [pickedItems, setPickedItems] = useState<Set<number>>(new Set());

  if (!user) return null;
  const existingTasks = scopedRows(db.study_tasks, user.id);
  const existingCourses = scopedRows(db.courses, user.id);

  const readFile = async (file: File) => {
    setBusy(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const extracted = await extractPdfText(file);
        if (!extracted) {
          toast.error("Couldn't read text from this PDF — it may be a scanned image. Try pasting the text or a photo instead.");
          return;
        }
        setText((t) => (t ? `${t}\n\n${extracted}` : extracted).slice(0, 40000));
      } else if (file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt")) {
        const content = (await file.text()).slice(0, 40000);
        setText((t) => (t ? `${t}\n\n${content}` : content));
      } else if (file.type.startsWith("image/")) {
        if (file.size > 4_000_000) {
          toast.error("That image is too large (over 4 MB). Try a smaller photo or paste the text.");
          return;
        }
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("read failed"));
          reader.readAsDataURL(file);
        });
        imageRef.current = dataUrl;
        toast.success("Image ready. Press Scan syllabus to read it.");
      } else {
        toast.error("Supported files: PDF, image or plain text.");
      }
    } catch {
      toast.error("That file couldn't be read. Try another one or paste the text.");
    } finally {
      setBusy(false);
    }
  };

  const scan = async () => {
    if (!text.trim() && !imageRef.current) {
      toast.error("Upload a syllabus file or paste its text first.");
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await parseSyllabusAI({ data: { text: text.slice(0, 40000), image: imageRef.current || undefined } });
      if (!res.ok) {
        if ("limitReached" in res && res.limitReached) toast.error(res.error);
        else if (("setupRequired" in res && res.setupRequired) || isAiSetupIssue(res.error))
          toast.info(res.error);
        else toast.error(res.error);
        return;
      }
      if (!res.courses.length && !res.items.length) {
        toast.error("The AI didn't find any courses, assignments or exams in this document.");
        return;
      }
      setResult({ courses: res.courses, items: res.items });
      setPickedCourses(new Set(res.courses.map((_, i) => i)));
      setPickedItems(
        new Set(
          res.items
            .map((item, i) => (item.date || item.course ? i : -1))
            .filter((i) => i >= 0),
        ),
      );
      toast.success("Syllabus read. Review the items below before adding them.");
    } catch {
      toast.error("The AI is unavailable right now. Please try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const addToPlanner = () => {
    if (!result) return;
    let coursesAdded = 0;
    let tasksAdded = 0;
    let skipped = 0;

    result.courses.forEach((c, i) => {
      if (!pickedCourses.has(i)) return;
      if (existingCourses.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) return;
      createCourse(user.id, { name: c.name, instructor: c.instructor, color: "#0e7c66" });
      coursesAdded += 1;
    });

    result.items.forEach((item, i) => {
      if (!pickedItems.has(i)) return;
      const duplicate = existingTasks.some(
        (t) => t.title.toLowerCase() === item.title.toLowerCase() && (item.date ? t.date === item.date : true),
      );
      if (duplicate) {
        skipped += 1;
        return;
      }
      createTask(user.id, {
        subject: item.course || "General",
        topic: "",
        title: item.title,
        date: item.date || todayISO(),
        time: "18:00",
        minutes: item.kind === "exam" ? 90 : item.kind === "project" ? 120 : 45,
        priority: item.priority,
        is_exam: item.kind === "exam",
      });
      tasksAdded += 1;
    });

    if (!coursesAdded && !tasksAdded) {
      toast.info(skipped ? "Everything was already in your planner." : "Nothing was selected.");
      return;
    }
    toast.success(`${coursesAdded} course${coursesAdded === 1 ? "" : "s"} and ${tasksAdded} item${tasksAdded === 1 ? "" : "s"} added to your planner.`);
    setResult(null);
    setText("");
  };

  const toggle = (set: Set<number>, i: number, apply: (s: Set<number>) => void) => {
    const next = new Set(set);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    apply(next);
  };

  return (
    <AppShell title="Syllabus Scanner" description="Upload your syllabus — Student Hub organizes your semester.">
      <InfoNote
        title="How it works"
        description="Upload a PDF, a photo of your syllabus or paste its text. The AI lists the courses, assignments, exams and dates it finds — you review and choose what goes into your planner. Uses 1 of your 15 daily AI questions."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="panel p-5">
          <div
            className={cn(
              "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border px-6 py-10 text-center transition-colors",
              !busy && "hover:border-brand/60",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (file) void readFile(file);
            }}
          >
            <FileUp className="size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Drag a syllabus here, or choose a file</p>
            <p className="mt-1 text-xs text-muted-foreground">PDF, photo or text file — up to 4 MB for images</p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,application/pdf,image/*,text/plain"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void readFile(file);
                e.target.value = "";
              }}
            />
            <Button variant="outline" size="sm" className="mt-4" disabled={busy} onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="syllabus-text">Or paste the syllabus text</Label>
            <Textarea
              id="syllabus-text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your course outline here — assignments, exams and due dates."
            />
          </div>

          <Button
            onClick={() => void scan()}
            disabled={busy}
            className="mt-4 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
            {busy ? "Reading your syllabus…" : "Scan syllabus"}
          </Button>

          {result ? (
            <div className="mt-6 space-y-4 border-t border-border pt-5">
              <h2 className="text-lg font-semibold">What the AI found</h2>
              {result.courses.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Courses</p>
                  <ul className="mt-2 space-y-2">
                    {result.courses.map((c, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm">
                        <Checkbox
                          checked={pickedCourses.has(i)}
                          onCheckedChange={() => toggle(pickedCourses, i, setPickedCourses)}
                          aria-label={`Add course ${c.name}`}
                        />
                        <span className="font-medium">{c.name}</span>
                        {c.instructor ? <span className="text-muted-foreground">· {c.instructor}</span> : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {result.items.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Assignments, exams & projects</p>
                  <ul className="mt-2 space-y-2">
                    {result.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5 text-sm">
                        <Checkbox
                          checked={pickedItems.has(i)}
                          onCheckedChange={() => toggle(pickedItems, i, setPickedItems)}
                          aria-label={`Add ${item.title}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">
                            {item.kind === "exam" ? "Exam · " : item.kind === "project" ? "Project · " : ""}
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.course || "General"}
                            {item.date ? ` · due ${new Date(`${item.date}T00:00:00`).toLocaleDateString()}` : " · date not stated"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                          {item.priority}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button onClick={addToPlanner} className="bg-brand text-brand-foreground hover:bg-brand/90">
                <CalendarDays className="size-4" /> Add selected to my planner
              </Button>
            </div>
          ) : null}
        </div>

        <div className="panel h-fit p-5">
          <h2 className="text-sm font-semibold">Tips for best results</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Syllabus tables with clear dates give the best extraction.</li>
            <li>If a photo is blurry or a PDF is a scan without text, paste the text instead.</li>
            <li>Items without a stated date go to today — fix the date in the planner afterwards.</li>
            <li>Duplicates already in your planner are skipped automatically.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
