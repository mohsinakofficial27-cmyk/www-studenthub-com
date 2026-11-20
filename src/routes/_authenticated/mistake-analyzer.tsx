import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ScanSearch } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth, useDb } from "@/lib/auth";
import { scopedRows } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/mistake-analyzer")({
  component: MistakeAnalyzerPage,
});

function MistakeAnalyzerPage() {
  const { user } = useAuth();
  const db = useDb();
  if (!user) return null;
  const quizzes = scopedRows(db.quizzes, user.id);
  const attempts = scopedRows(db.quiz_attempts, user.id);
  const quizById = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
  const topicStats = new Map<
    string,
    {
      subject: string;
      topic: string;
      wrong: number;
      answered: number;
      examples: string[];
      local: boolean;
    }
  >();

  for (const attempt of attempts) {
    const quiz = quizById.get(attempt.quiz_id);
    if (!quiz) continue;
    const topic = quiz.topic.trim() || "General";
    const key = `${quiz.subject}::${topic}`;
    const stats = topicStats.get(key) ?? {
      subject: quiz.subject,
      topic,
      wrong: 0,
      answered: 0,
      examples: [],
      local: false,
    };
    stats.local ||= Boolean(attempt.local_only);
    for (const [index, question] of quiz.questions.entries()) {
      const answer = attempt.answers[index];
      if (answer === undefined || answer < 0) continue;
      stats.answered += 1;
      if (answer !== question.answer) {
        stats.wrong += 1;
        if (stats.examples.length < 3) stats.examples.push(question.prompt);
      }
    }
    topicStats.set(key, stats);
  }

  const weakTopics = [...topicStats.values()]
    .filter((topic) => topic.wrong > 0)
    .sort((a, b) => b.wrong / b.answered - a.wrong / a.answered || b.wrong - a.wrong);

  return (
    <AppShell
      title="AI Mistake Analyzer"
      description="Spot recurring missed quiz questions and decide what to review next."
    >
      <InfoNote
        title="Transparent quiz analysis"
        description="This report compares your recorded answers with saved quiz answer keys. It doesn't use AI or infer ability from missing data."
      />
      {attempts.some((attempt) => attempt.local_only) ? (
        <p className="mt-3 rounded-xl border border-border bg-secondary/50 px-4 py-3 text-xs text-muted-foreground">
          Some attempts are stored only in this browser because the quiz-history table or service is
          unavailable.
        </p>
      ) : null}
      {weakTopics.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={ScanSearch}
          title={
            attempts.length
              ? "No missed answers in recorded attempts"
              : "Take a quiz to find review areas"
          }
          description={
            attempts.length
              ? "Keep practising; this report updates from your saved quiz attempts."
              : "Your topic analysis will appear after you complete and submit a quiz."
          }
          action={
            !attempts.length ? (
              <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
                <Link to="/quizzes">
                  Open quiz generator <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {weakTopics.map((topic) => (
            <article key={`${topic.subject}-${topic.topic}`} className="panel p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {topic.subject}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">{topic.topic}</h2>
                </div>
                <span className="rounded-full bg-warning/15 px-3 py-1 text-sm font-medium text-warning">
                  {topic.wrong}/{topic.answered} missed
                </span>
              </div>
              {topic.local ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Includes browser-only attempts.
                </p>
              ) : null}
              {topic.examples.length ? (
                <div className="mt-4">
                  <p className="text-sm font-medium">Questions to revisit</p>
                  <ul className="mt-2 space-y-2">
                    {topic.examples.map((question) => (
                      <li key={question} className="rounded-lg bg-secondary/60 p-3 text-sm">
                        {question}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button asChild variant="outline" size="sm" className="mt-4">
                <Link to="/quizzes">
                  Practice this subject <ArrowRight className="size-4" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
