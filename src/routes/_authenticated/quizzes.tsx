import { createFileRoute } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUIZ_SUBJECTS, generateQuizQuestions } from "@/lib/ai";
import { useAuth, useDb } from "@/lib/auth";
import { createQuiz, recordAttempt, scopedRows } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({
    meta: [
      { title: "Quiz Generator — Student Hub" },
      { name: "description", content: "Generate multiple-choice quizzes by subject, topic and difficulty, and track your scores." },
      { property: "og:title", content: "Quiz Generator — Student Hub" },
      { property: "og:description", content: "Practice quizzes with instant marking." },
    ],
  }),
  component: QuizzesPage,
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function QuizzesPage() {
  const { user } = useAuth();
  const db = useDb();
  const [subject, setSubject] = useState(QUIZ_SUBJECTS[0] ?? "Mathematics");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;
  const quizzes = scopedRows(db.quizzes, user.id);
  const attempts = scopedRows(db.quiz_attempts, user.id);
  const quiz = quizzes.find((q) => q.id === quizId) ?? null;

  const generate = async () => {
    setBusy(true);
    try {
      const questions = await generateQuizQuestions({ subject, topic, difficulty, count });
      const id = createQuiz(user.id, { subject, topic: topic.trim(), difficulty, questions });
      setQuizId(id);
      setAnswers(Array(questions.length).fill(-1));
      setSubmitted(false);
    } catch {
      toast.error("Could not build that quiz. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const score = quiz ? quiz.questions.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0) : 0;

  const submit = () => {
    if (!quiz) return;
    if (answers.some((a) => a < 0)) {
      toast.error("Answer every question before submitting.");
      return;
    }
    setSubmitted(true);
    recordAttempt(user.id, quiz.id, answers, score, quiz.questions.length);
  };

  return (
    <AppShell title="Quiz Generator" description="Build a practice quiz, sit it, and see where you went wrong.">
      <InfoNote
        title="Questions come from a built-in bank"
        description="No AI provider is connected yet, so quizzes are drawn from a curated demo question bank per subject. Connect a provider to generate questions on any topic."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="panel h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold">New quiz</h2>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <select id="subject" className={selectClass} value={subject} onChange={(e) => setSubject(e.target.value)}>
              {QUIZ_SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Calculus" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              id="difficulty"
              className={selectClass}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as "easy" | "medium" | "hard")}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="count">Number of questions</Label>
            <Input
              id="count"
              type="number"
              min="1"
              max="20"
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <Button
            onClick={() => void generate()}
            disabled={busy}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {busy ? "Building quiz…" : "Generate quiz"}
          </Button>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-semibold">Quiz history</p>
            {attempts.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No attempts yet.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {attempts.slice(0, 8).map((a) => {
                  const q = quizzes.find((x) => x.id === a.quiz_id);
                  return (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="truncate text-muted-foreground">{q?.subject ?? "Quiz"}</span>
                      <span className="font-medium">
                        {a.score}/{a.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="panel p-5">
          {!quiz ? (
            <EmptyState
              className="border-0 bg-transparent"
              icon={ListChecks}
              title="No quiz open"
              description="Choose a subject and difficulty on the left, then generate a quiz to start practising."
            />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">
                    {quiz.subject}
                    {quiz.topic ? ` · ${quiz.topic}` : ""}
                  </h2>
                  <p className="text-sm text-muted-foreground capitalize">
                    {quiz.difficulty} · {quiz.questions.length} questions
                  </p>
                </div>
                {submitted ? (
                  <p className="text-2xl font-semibold">
                    {score}/{quiz.questions.length}
                  </p>
                ) : null}
              </div>

              <ol className="mt-5 space-y-5">
                {quiz.questions.map((q, qi) => (
                  <li key={q.id} className="rounded-2xl border border-border p-4">
                    <p className="font-medium">
                      {qi + 1}. {q.prompt}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {q.options.map((opt, oi) => {
                        const chosen = answers[qi] === oi;
                        const correct = submitted && oi === q.answer;
                        const wrong = submitted && chosen && oi !== q.answer;
                        return (
                          <button
                            key={oi}
                            type="button"
                            disabled={submitted}
                            onClick={() => setAnswers((a) => a.map((v, i) => (i === qi ? oi : v)))}
                            className={cn(
                              "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                              chosen && !submitted && "border-brand bg-brand-soft",
                              !chosen && !submitted && "border-border hover:border-brand/50",
                              correct && "border-success bg-success/10",
                              wrong && "border-destructive bg-destructive/10",
                            )}
                          >
                            <span className="text-xs font-semibold text-muted-foreground">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {submitted ? <p className="mt-3 text-sm text-muted-foreground">{q.explanation}</p> : null}
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex flex-wrap gap-3">
                {submitted ? (
                  <>
                    <Button
                      className="bg-brand text-brand-foreground hover:bg-brand/90"
                      onClick={() => {
                        setAnswers(Array(quiz.questions.length).fill(-1));
                        setSubmitted(false);
                      }}
                    >
                      Retry quiz
                    </Button>
                    <Button variant="outline" onClick={() => void generate()}>
                      New quiz
                    </Button>
                  </>
                ) : (
                  <Button onClick={submit} className="bg-brand text-brand-foreground hover:bg-brand/90">
                    Submit answers
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
