import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useDb } from "@/lib/auth";
import { cardsFromText, createCard, createDeck, createNote, deleteNote, scopedRows, summarise, updateNote } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({
    meta: [
      { title: "My Notes — Student Hub" },
      { name: "description", content: "Write, summarise and organise your study notes, then turn them into flashcards." },
      { property: "og:title", content: "My Notes — Student Hub" },
      { property: "og:description", content: "Your study notes, organised." },
    ],
  }),
  component: NotesPage,
});

type Tab = "all" | "recent" | "favorites";

function NotesPage() {
  const { user } = useAuth();
  const db = useDb();
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

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
    createNote(user.id, { title, content, subject: subject.trim() || "General" });
    setTitle("");
    setSubject("");
    setContent("");
    toast.success("Note saved.");
  };

  const open = notes.find((n) => n.id === openId) ?? null;

  return (
    <AppShell title="AI Notes" description="Write or paste your material, then turn it into study resources.">
      <InfoNote
        title="Summaries are generated on your device"
        description="No AI provider is connected yet, so summaries and key points come from simple text analysis in the app. Document and PDF upload will appear here once cloud storage is connected."
      />

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
                  : "Write your first note on the right — you can summarise it and turn it into flashcards afterwards."
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
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Summary</p>
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
                          variant="outline"
                          onClick={() => {
                            updateNote(n.id, summarise(n.content));
                            toast.success("Summary and key points added.");
                          }}
                        >
                          Generate summary
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const cards = cardsFromText(n.content);
                            if (!cards.length) {
                              toast.error("Write lines like “Term: definition” so cards can be made.");
                              return;
                            }
                            const deckId = createDeck(user.id, n.title, n.subject);
                            cards.forEach((c) => createCard(user.id, deckId, c.front, c.back));
                            toast.success(`${cards.length} flashcards created in a new deck.`);
                          }}
                        >
                          Make flashcards
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

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
              placeholder={"Write or paste your notes.\nTip: lines like “Osmosis: movement of water…” become flashcards."}
            />
          </div>
          <Button type="submit" className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            Save note
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
