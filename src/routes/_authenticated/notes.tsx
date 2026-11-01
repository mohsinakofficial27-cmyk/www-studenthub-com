import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, Sparkles, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateNoteStudy } from "@/lib/ai.functions";
import { useAuth, useDb } from "@/lib/auth";
import { createCard, createDeck, createNote, createQuiz, deleteNote, scopedRows, updateNote } from "@/lib/data";
import { mutate, uid } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "AI Notes — Student Hub" },
      { name: "description", content: "Paste your notes and turn them into a summary, flashcards and a practice quiz with AI." },
      { property: "og:title", content: "AI Notes — Student Hub" },
      { property: "og:description", content: "Your notes, turned into a study system." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NotesPage,
});

type Tab = "all" | "recent" | "favorites";

const SUGGESTIONS = [
  { title: "Photosynthesis", subject: "Biology", content: "Photosynthesis is the process plants use to convert light energy into chemical energy. It takes place in the chloroplasts, which contain chlorophyll. Carbon dioxide and water are converted into glucose and oxygen. Light-dependent reactions happen in the thylakoid membrane, while the Calvin cycle happens in the stroma. The overall equation is 6CO2 + 6H2O -> C6H12O6 + 6O2." },
  { title: "Supply and demand", subject: "Economics", content: "Demand is the quantity of a good buyers want at each price; it slopes downward because lower prices make goods more attractive. Supply is the quantity sellers offer at each price; it slopes upward. The market clears where the two curves cross: the equilibrium price. A shortage pushes prices up, a surplus pushes prices down. Shifts in demand or supply move the equilibrium." },
  { title: "The American Revolution", subject: "History", content: "The American Revolution (1765-1783) began as a dispute over taxation without representation. Key events include the Stamp Act, the Boston Tea Party, and the battles of Lexington and Concord. The Declaration of Independence was signed on July 4, 1776. Washington's army won decisive victories at Trenton and Saratoga. The Treaty of Paris in 1783 recognized American independence." },
];

function NotesPage() {
  const { user } = useAuth();
  const db = useDb();
  const generate = useServerFn(generateNoteStudy);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [limitMsg, setLimitMsg] = useState("");

  const notes = useMemo(() => (user ? scopedRows(db.notes, user.id) : []), [db.notes, user]);

  if (!user) return null;

  const filtered = notes
    .filter((n) => (tab === "favorites" ? n.favorite : true))
    .filter((n) =>
      query.trim()
        ? `${n.title} ${n.content} ${n.subject}`.toLowerCase().includes(query.trim().toLowerCase())
        : true,
    )
    .slice(0, tab === "recent" ? 5 : undefined);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !title.trim()) {
      toast.error("Add a title or some content first.");
      return;
    }
    const id = createNote(user.id, { title, content, subject: subject.trim() || "General" });
    setTitle("");
    setSubject("");
    setContent("");
    setOpenId(id);
    toast.success("Note saved. Open it to turn it into a study system.");
  };

  const runAi = async (
    noteId: string,
    note: { title: string; subject: string; content: string },
    action: "summary" | "flashcards" | "quiz",
  ) => {
    if (note.content.trim().length < 40) {
      toast.error("Add a bit more content first — AI needs at least a few sentences to work with.");
      return;
    }
    setBusyId(`${noteId}:${action}`);
    try {
      const result = await generate({ data: { title: note.title, subject: note.subject, content: note.content } });
      if (!result.ok) {
        if ("limitReached" in result && result.limitReached) setLimitMsg(result.error);
        else toast.error(result.error);
        return;
      }
      if (action === "summary") {
        updateNote(noteId, { summary: result.summary, key_points: result.key_points });
        toast.success("AI summary and key points added.");
      } else if (action === "flashcards") {
        const cards = result.flashcards;
        if (!cards.length) {
          toast.error("The AI couldn't find enough facts to make cards. Try again.");
          return;
        }
        const deckId = createDeck(user.id, note.title || "AI deck", note.subject);
        cards.forEach((c) => createCard(user.id, deckId, c.front, c.back));
        toast.success(`${cards.length} flashcards created in a new deck.`);
      } else {
        const questions = result.questions.map((q, i) => ({ ...q, id: `q${i}` }));
        if (!questions.length) {
          toast.error("The AI couldn't write questions for these notes. Try again.");
          return;
        }
        createQuiz(user.id, {
          subject: note.subject || "General",
          topic: note.title,
          difficulty: "medium",
          questions,
        });
        toast.success(`${questions.length}-question practice quiz created. Find it in Quiz Generator.`);
      }
    } catch {
      toast.error("The AI is unavailable right now. Please try again in a moment.");
    } finally {
      setBusyId(null);
    }
  };

  const open = notes.find((n) => n.id === openId) ?? null;
  const busyLabel = (noteId: string, action: string) =>
    busyId === `${noteId}:${action}` ? <Loader2 className="size-3.5 animate-spin" /> : null;

  return (
    <AppShell title="AI Notes" description="Paste your material — the AI turns it into a summary, flashcards and a practice quiz.">
      {limitMsg ? (
        <InfoNote title="Daily limit reached" description={limitMsg} />
      ) : (
        <InfoNote
          title="How AI notes work"
          description="Summary, flashcards and quizzes are generated by the AI Study Assistant. Each AI action uses 1 of your 15 daily AI questions (fair usage limit, resets daily)."
        />
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "recent", "favorites"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors",
                  tab === t
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border text-muted-foreground hover:border-brand/50",
                )}
              >
                {t === "all" ? "My notes" : t === "recent" ? "Recent" : "Favorites"}
              </button>
            ))}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes"
              className="ml-auto w-full sm:w-52"
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              className="mt-5 border-0 bg-transparent"
              icon={BookOpen}
              title={notes.length ? "Nothing matches that" : "No notes yet"}
              description={
                notes.length
                  ? "Try a different word, or clear the search box."
                  : "Paste a lecture, chapter or your own notes on the right — then generate a summary, flashcards and a quiz from it."
              }
            />
          ) : (
            <ul className="mt-5 space-y-3">
              {filtered.map((n) => (
                <li key={n.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => setOpenId(openId === n.id ? null : n.id)}
                    >
                      <p className="font-medium">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.subject} · {new Date(n.updated_at).toLocaleDateString()}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Favorite"
                      onClick={() => updateNote(n.id, { favorite: !n.favorite })}
                    >
                      <Star className={cn("size-4", n.favorite && "fill-warning text-warning")} />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Delete note" onClick={() => deleteNote(n.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {openId === n.id ? (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">{n.content}</p>
                      {n.summary ? (
                        <div className="rounded-xl bg-surface p-3">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">AI summary</p>
                          <p className="mt-1 text-sm">{n.summary}</p>
                          {n.key_points?.length ? (
                            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                              {n.key_points.map((k, i) => (
                                <li key={i}>{k}</li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          className="bg-brand text-brand-foreground hover:bg-brand/90"
                          disabled={busyId !== null}
                          onClick={() => void runAi(n.id, n, "summary")}
                        >
                          {busyLabel(n.id, "summary")} <Sparkles className="size-3.5" /> AI summary & key points
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId !== null}
                          onClick={() => void runAi(n.id, n, "flashcards")}
                        >
                          {busyLabel(n.id, "flashcards")} Make flashcards
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId !== null}
                          onClick={() => void runAi(n.id, n, "quiz")}
                        >
                          {busyLabel(n.id, "quiz")} Make practice quiz
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          <form onSubmit={save} className="panel h-fit space-y-4 p-5">
            <h2 className="text-lg font-semibold">New note</h2>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Biology"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste a lecture, a chapter, or write your own notes here."
              />
            </div>
            <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              Save note
            </Button>
          </form>

          {notes.length === 0 ? (
            <div className="panel p-5">
              <h2 className="text-sm font-semibold">Try it with a sample</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Loads a short example into the form so you can see how the AI study system works.
              </p>
              <div className="mt-3 grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => {
                      setTitle(s.title);
                      setSubject(s.subject);
                      setContent(s.content);
                    }}
                    className="rounded-xl border border-border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-brand/50 hover:bg-brand-soft/40"
                  >
                    {s.title} · {s.subject}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
