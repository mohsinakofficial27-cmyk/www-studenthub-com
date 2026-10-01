import { createFileRoute } from "@tanstack/react-router";
import { Layers, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useDb } from "@/lib/auth";
import { createCard, createDeck, deleteCard, deleteDeck, scopedRows, updateCard } from "@/lib/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({
    meta: [
      { title: "Flashcards — Student Hub" },
      { name: "description", content: "Build decks, practise with flip cards and rate how well you knew each one." },
      { property: "og:title", content: "Flashcards — Student Hub" },
      { property: "og:description", content: "Decks and practice mode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { user } = useAuth();
  const db = useDb();
  const [deckName, setDeckName] = useState("");
  const [deckSubject, setDeckSubject] = useState("");
  const [activeDeck, setActiveDeck] = useState<string | null>(null);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [practice, setPractice] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (!user) return null;
  const decks = scopedRows(db.flashcard_decks, user.id);
  const deck = decks.find((d) => d.id === activeDeck) ?? decks[0] ?? null;
  const cards = deck ? scopedRows(db.flashcards, user.id).filter((c) => c.deck_id === deck.id) : [];
  const card = cards[index] ?? null;

  const rate = (confidence: "easy" | "medium" | "hard") => {
    if (card) updateCard(card.id, { confidence });
    setFlipped(false);
    setIndex((i) => (i + 1) % Math.max(cards.length, 1));
  };

  return (
    <AppShell title="Flashcards" description="Make decks from your subjects and drill them until they stick.">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="panel h-fit p-5">
          <h2 className="text-lg font-semibold">Decks</h2>
          <form
            className="mt-3 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!deckName.trim()) {
                toast.error("Name the deck first.");
                return;
              }
              const id = createDeck(user.id, deckName, deckSubject);
              setActiveDeck(id);
              setDeckName("");
              setDeckSubject("");
              toast.success("Deck created.");
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="deck">Deck name</Label>
              <Input id="deck" value={deckName} onChange={(e) => setDeckName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dsubject">Subject</Label>
              <Input id="dsubject" value={deckSubject} onChange={(e) => setDeckSubject(e.target.value)} />
            </div>
            <Button type="submit" variant="outline" className="w-full">
              Create deck
            </Button>
          </form>

          <ul className="mt-5 space-y-1">
            {decks.map((d) => {
              const count = db.flashcards.filter((c) => c.deck_id === d.id).length;
              return (
                <li key={d.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDeck(d.id);
                      setIndex(0);
                      setFlipped(false);
                      setPractice(false);
                    }}
                    className={cn(
                      "min-w-0 flex-1 truncate rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                      deck?.id === d.id && "bg-brand-soft text-accent-foreground",
                    )}
                  >
                    {d.name} <span className="text-xs text-muted-foreground">({count})</span>
                  </button>
                  <Button variant="ghost" size="icon" aria-label="Delete deck" onClick={() => deleteDeck(d.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="panel p-5">
          {!deck ? (
            <EmptyState
              className="border-0 bg-transparent"
              icon={Layers}
              title="No decks yet"
              description="Create your first deck on the left, or generate one automatically from a note in AI Notes."
            />
          ) : practice ? (
            <div className="flex flex-col items-center py-6">
              <p className="text-sm text-muted-foreground">
                Card {cards.length ? index + 1 : 0} of {cards.length}
              </p>
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="mt-5 flex min-h-56 w-full max-w-xl items-center justify-center rounded-3xl border border-border bg-surface p-8 text-center text-lg"
              >
                {card ? (flipped ? card.back : card.front) : "This deck has no cards yet."}
              </button>
              <p className="mt-3 text-xs text-muted-foreground">Tap the card to flip it.</p>
              {card ? (
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <Button variant="outline" onClick={() => rate("hard")}>
                    Hard
                  </Button>
                  <Button variant="outline" onClick={() => rate("medium")}>
                    Medium
                  </Button>
                  <Button className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => rate("easy")}>
                    Easy
                  </Button>
                </div>
              ) : null}
              <Button variant="ghost" className="mt-6" onClick={() => setPractice(false)}>
                Back to deck
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{deck.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {deck.subject} · {cards.length} card{cards.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Button
                  disabled={!cards.length}
                  className="bg-brand text-brand-foreground hover:bg-brand/90"
                  onClick={() => {
                    setPractice(true);
                    setIndex(0);
                    setFlipped(false);
                  }}
                >
                  Practise deck
                </Button>
              </div>

              <form
                className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!front.trim() || !back.trim()) {
                    toast.error("Fill in both sides of the card.");
                    return;
                  }
                  createCard(user.id, deck.id, front.trim(), back.trim());
                  setFront("");
                  setBack("");
                }}
              >
                <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Front (term/question)" />
                <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Back (definition/answer)" />
                <Button type="submit" variant="outline">
                  Add card
                </Button>
              </form>

              {cards.length === 0 ? (
                <EmptyState
                  className="mt-5 border-0 bg-transparent"
                  icon={Layers}
                  title="This deck is empty"
                  description="Add a card above, or create cards automatically from one of your notes."
                />
              ) : (
                <ul className="mt-5 space-y-2">
                  {cards.map((c) => (
                    <li key={c.id} className="flex items-start gap-3 rounded-xl border border-border px-3.5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{c.front}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{c.back}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] capitalize text-muted-foreground">
                        {c.confidence}
                      </span>
                      <Button variant="ghost" size="icon" aria-label="Delete card" onClick={() => deleteCard(c.id)}>
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
