import { createFileRoute } from "@tanstack/react-router";
import { BookOpenCheck, Zap } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { useAuth, useDb } from "@/lib/auth";
import { scopedRows } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/exam-crammer")({
  component: ExamCrammerPage,
});

const QUICK_REFERENCE: Record<string, string[]> = {
  math: ["Slope: m = (y₂ − y₁) / (x₂ − x₁)", "Quadratic formula: x = (−b ± √(b² − 4ac)) / 2a", "Pythagorean theorem: a² + b² = c²"],
  physics: ["Speed = distance ÷ time", "Newton's second law: F = ma", "Work = force × displacement (in the direction of motion)"],
  chemistry: ["Density = mass ÷ volume", "Molarity = moles of solute ÷ litres of solution", "Balance atoms on both sides of a chemical equation"],
  biology: ["Photosynthesis: carbon dioxide + water + light → glucose + oxygen", "Cellular respiration releases usable energy from glucose", "DNA base pairs: A–T and C–G"],
};

function extractSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((line) => line.replace(/^[-*•\d.)\s]+/u, "").trim())
    .filter((line) => line.length > 18 && line.length < 280);
}

function ExamCrammerPage() {
  const { user } = useAuth();
  const db = useDb();
  const [subject, setSubject] = useState("All subjects");
  if (!user) return null;

  const notes = scopedRows(db.notes, user.id);
  const subjects = [
    ...new Set([
      ...notes.map((note) => note.subject.trim()),
      ...scopedRows(db.quizzes, user.id).map((quiz) => quiz.subject.trim()),
      ...scopedRows(db.study_tasks, user.id).map((task) => task.subject.trim()),
      ...scopedRows(db.courses, user.id).map((course) => course.name.trim()),
    ].filter(Boolean)),
  ].sort();
  const selectedNotes = notes.filter((note) => subject === "All subjects" || note.subject === subject);
  const sourceLines = selectedNotes.flatMap((note) => [
    ...(note.key_points ?? []),
    ...(note.summary ? [note.summary] : []),
    ...extractSentences(note.content),
  ]);
  const uniqueLines = [...new Set(sourceLines.map((line) => line.trim()).filter(Boolean))];
  const definitions = uniqueLines.filter((line) => /\b(is defined as|means|refers to|is called)\b/iu.test(line)).slice(0, 6);
  const quickPoints = uniqueLines.filter((line) => !definitions.includes(line)).slice(0, 10);
  const formulaKey = Object.keys(QUICK_REFERENCE).find((key) => subject.toLowerCase().includes(key));
  const quickReference = subject === "All subjects" ? [] : QUICK_REFERENCE[formulaKey ?? ""] ?? [];

  return (
    <AppShell title="Midnight Exam Crammer" description="A focused last-minute review sheet built from your own saved notes.">
      <InfoNote
        title="Use this as a quick review, not a complete syllabus"
        description="Your saved notes are the source of personalized content. The small formula reference is general and should be checked against your course materials."
      />
      <div className="panel mt-4 p-5">
        <label htmlFor="cram-subject" className="text-sm font-medium">Subject</label>
        <select id="cram-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm sm:max-w-sm">
          <option>All subjects</option>
          {subjects.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>

      {uniqueLines.length === 0 && quickReference.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={BookOpenCheck}
          title="No saved review material for this subject"
          description="Add notes with definitions, summaries, or key points and they will appear here. This tool won't invent a subject-specific cram sheet."
        />
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {definitions.length ? (
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-semibold"><BookOpenCheck className="size-4 text-brand" /> Definitions from your notes</h2>
              <ul className="mt-3 space-y-2">{definitions.map((line, index) => <li key={`${index}-${line}`} className="rounded-xl bg-secondary/60 p-3 text-sm">{line}</li>)}</ul>
            </section>
          ) : null}
          {quickReference.length ? (
            <section className="panel p-5">
              <h2 className="flex items-center gap-2 font-semibold"><Zap className="size-4 text-warning" /> Quick reference</h2>
              <ul className="mt-3 space-y-2">{quickReference.map((line) => <li key={line} className="rounded-xl bg-secondary/60 p-3 text-sm">{line}</li>)}</ul>
            </section>
          ) : null}
          {quickPoints.length ? (
            <section className="panel p-5 lg:col-span-2">
              <h2 className="font-semibold">Key points from your saved notes</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">{quickPoints.map((line, index) => <li key={`${index}-${line}`} className="rounded-xl border border-border p-3 text-sm">{line}</li>)}</ul>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
