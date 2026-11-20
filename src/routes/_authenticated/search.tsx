import { Link, createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Input } from "@/components/ui/input";
import { useAuth, useDb } from "@/lib/auth";
import { scopedRows } from "@/lib/data";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({
    meta: [
      { title: "Search — Student Hub" },
      {
        name: "description",
        content: "Search across your notes, flashcards, quizzes and planner tasks.",
      },
      { property: "og:title", content: "Search — Student Hub" },
      { property: "og:description", content: "Find anything in your study workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { user } = useAuth();
  const db = useDb();
  const [query, setQuery] = useState("");
  if (!user) return null;

  const q = query.trim().toLowerCase();
  const match = (text: string) => q.length > 0 && text.toLowerCase().includes(q);

  const notes = scopedRows(db.notes, user.id).filter((n) =>
    match(`${n.title} ${n.content} ${n.subject}`),
  );
  const cards = scopedRows(db.flashcards, user.id).filter((c) => match(`${c.front} ${c.back}`));
  const quizzes = scopedRows(db.quizzes, user.id).filter((z) => match(`${z.subject} ${z.topic}`));
  const tasks = scopedRows(db.study_tasks, user.id).filter((t) =>
    match(`${t.title} ${t.subject} ${t.topic}`),
  );
  const total = notes.length + cards.length + quizzes.length + tasks.length;

  return (
    <AppShell title="Search" description="Look across everything you've saved in Student Hub.">
      <Input
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search notes, flashcards, quizzes and tasks"
        className="max-w-xl"
      />

      {!q ? (
        <EmptyState
          className="mt-6"
          icon={Search}
          title="Start typing"
          description="Results from your notes, flashcards, quizzes and planner tasks appear here as you type."
        />
      ) : total === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Search}
          title="No matches"
          description="Nothing in your study content matches that. Try a shorter word or a subject name."
        />
      ) : (
        <div className="mt-6 space-y-6">
          {notes.length ? (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Notes
              </h2>
              <ul className="mt-3 space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-xl border border-border px-4 py-3">
                    <Link to="/notes" className="text-sm font-medium hover:underline">
                      {n.title}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.content}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {cards.length ? (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Flashcards
              </h2>
              <ul className="mt-3 space-y-2">
                {cards.map((c) => (
                  <li key={c.id} className="rounded-xl border border-border px-4 py-3">
                    <Link to="/flashcards" className="text-sm font-medium hover:underline">
                      {c.front}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">{c.back}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {quizzes.length ? (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Quizzes
              </h2>
              <ul className="mt-3 space-y-2">
                {quizzes.map((z) => (
                  <li key={z.id} className="rounded-xl border border-border px-4 py-3">
                    <Link to="/quizzes" className="text-sm font-medium hover:underline">
                      {z.subject}
                      {z.topic ? ` · ${z.topic}` : ""}
                    </Link>
                    <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                      {z.difficulty} · {z.questions.length} questions
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {tasks.length ? (
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Planner tasks
              </h2>
              <ul className="mt-3 space-y-2">
                {tasks.map((t) => (
                  <li key={t.id} className="rounded-xl border border-border px-4 py-3">
                    <Link to="/planner" className="text-sm font-medium hover:underline">
                      {t.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {t.subject} · {t.date}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}
