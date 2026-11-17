import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ListChecks, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateQuizAI } from "@/lib/ai.functions";
import { isAiSetupIssue } from "@/lib/ai";
import { useAuth, useDb } from "@/lib/auth";
import { applyAttempt, applyLocalAttempt, createQuiz, scopedRows } from "@/lib/data";
import { recordQuizAttempt } from "@/lib/quiz.functions";
import { uid } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/quizzes")({
  head: () => ({
    meta: [
      { title: "Quiz Generator — Student Hub" },
      { name: "description", content: "Generate AI multiple-choice quizzes on any subject, topic and difficulty, and track your scores." },
      { property: "og:title", content: "Quiz Generator — Student Hub" },
      { property: "og:description", content: "Practice quizzes on any topic, with instant marking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: QuizzesPage,
});

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function QuizzesPage() {
  const { user } = useAuth();
  const db = useDb();
  const generate = useServerFn(generateQuizAI);
  const record = useServerFn(recordQuizAttempt);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [count, setCount] = useState(5);
  const [busy, setBusy] = useState(false);
  const [limitMsg, setLimitMsg] = useState("");
  const [quizId, setQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (!user) return null;
  const quizzes = scopedRows(db.quizzes, user.id);
  const attempts = scopedRows(db.quiz_attempts, user.id);
  const quiz = quizzes.find((q) => q.id === quizId) ?? null;

  const generateQuiz = async () => {
    if (!subject.trim()) {
      toast.error("Enter a subject first.");
      return;
    }
    setBusy(true);
    try {
      const result = await generate({
        data: {
          subject: subject.trim(),
          topic: topic.trim(),
          difficulty,
          count: Math.min(20, Math.max(3, Math.round(Number(count) || 5))),
        },
      });
      if (!result.ok) {
        if ("limitReached" in result && result.limitReached) setLimitMsg(result.error);
        else if (("setupRequired" in result && result.setupRequired) || isAiSetupIssue(result.error))
          toast.info(result.error);
        else toast.error(result.error);
        return;
      }
      const questions = result.questions.map(
        (q: { prompt: string; options: string[]; answer: number; explanation: string }, i: number) => ({
          ...q,
          id: `q${i}`,
        }),
      );
      const id = createQuiz(user.id, {
        subject: subject.trim(),
        topic: topic.trim(),
        difficulty,
        questions,
      });
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

  const submit = async () => {
    if (!quiz) return;
    if (answers.some((a) => a < 0)) {
      toast.error("Answer every question before submitting.");
      return;
    }
    setSubmitted(true);
    try {
      // The database grades the answers against the stored quiz, so the score
      // saved here is the server-computed one, never a client-supplied value.
      const result = await record({ data: { quizId: quiz.id, answers } });
      if (result.ok && result.attempt) applyAttempt(result.attempt);
      else {
        applyLocalAttempt({
          id: uid(),
          user_id: user.id,
          quiz_id: quiz.id,
          score,
          total: quiz.questions.length,
          answers,
          taken_at: new Date().toISOString(),
        });
        if ("setupRequired" in result && result.setupRequired)
          toast.info("Attempt saved in this browser only. Apply the quiz migration to sync it.");
        else toast.error(`${result.error ?? "Couldn't save your attempt."} Kept locally in this browser.`);
      }
    } catch {
      applyLocalAttempt({
        id: uid(),
        user_id: user.id,
        quiz_id: quiz.id,
        score,
        total: quiz.questions.length,
        answers,
        taken_at: new Date().toISOString(),
      });
      toast.error("Couldn't sync your attempt. It was kept in this browser only.");
    }
  };

  return (
    <AppShell title="Quiz Generator" description="Describe your topic — the AI writes the practice quiz, you sit it.">
      {limitMsg ? (
        <InfoNote title="Daily limit reached" description={limitMsg} />
      ) : (
        <InfoNote
          title="Quizzes are generated by AI"
          description="Generating a quiz uses 1 of your 15 daily AI questions (fair usage limit, resets daily)."
        />
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="panel h-fit space-y-4 p-5">
          <h2 className="text-lg font-semibold">New quiz</h2>
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology, Algebra, World History"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic">Topic (optional)</Label>
            <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Cell division" />
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
              min="3"
              max="20"
              value={count}
              onChange={(e) => setCount(Math.min(20, Math.max(3, Number(e.target.value) || 5)))}
            />
          </div>
          <Button
            onClick={() => void generateQuiz()}
            disabled={busy}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Writing your quiz…
              </>
            ) : (
              "Generate quiz"
            )}
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
                      <span className="truncate text-muted-foreground">
                        {q?.subject ?? "Quiz"}{a.local_only ? " · this browser" : ""}
                      </span>
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
              description="Enter a subject on the left, then generate a quiz to start practising. Add a topic to focus on exactly what your exam covers."
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
                    <Button variant="outline" onClick={() => void generateQuiz()}>
                      New quiz
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => void submit()} className="bg-brand text-brand-foreground hover:bg-brand/90">
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
