import { createFileRoute } from "@tanstack/react-router";
import { BrainCircuit, Send, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/concept-challenger")({
  component: ConceptChallengerPage,
});

type Message = { role: "student" | "challenger"; text: string };

const STARTERS = [
  "Why does sleep help memory?",
  "Explain a math concept",
  "Challenge my biology notes",
];

function challengeFor(topic: string, answer: string) {
  const prompt = answer.length > 180 ? `${answer.slice(0, 177)}...` : answer;
  return `Let's test that idea about ${topic || "your topic"}: you said, “${prompt}” What evidence supports it, and what counterexample or different viewpoint might change your conclusion?`;
}

function ConceptChallengerPage() {
  const [topic, setTopic] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  const send = (event: FormEvent) => {
    event.preventDefault();
    const answer = draft.trim();
    if (!answer) return;
    setMessages((current) => [
      ...current,
      { role: "student", text: answer },
      { role: "challenger", text: challengeFor(topic.trim(), answer) },
    ]);
    setDraft("");
  };

  return (
    <AppShell
      title="Concept Challenger"
      description="Practice defending an idea and looking at it from another angle."
    >
      <InfoNote
        title="Local practice mode"
        description="This is a guided, rule-based reflection tool—not an AI model. Your messages stay in this browser session."
      />
      <section className="panel mt-4 p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
            <BrainCircuit className="size-5" />
          </span>
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-semibold">Choose a subject or concept</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Write a claim, explanation, or answer to get a follow-up challenge.
              </p>
            </div>
            <Input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. photosynthesis, algebra, history"
            />
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((starter) => (
                <Button
                  key={starter}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTopic(starter)}
                >
                  {starter}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="panel mt-4 space-y-4 p-5" aria-live="polite">
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Sparkles className="mx-auto size-6 text-brand" />
            <h2 className="mt-3 font-semibold">Start with what you think is true</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The challenger will ask you to test your reasoning with evidence and counterexamples.
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={`max-w-3xl rounded-2xl p-4 text-sm ${message.role === "student" ? "ms-auto bg-brand text-brand-foreground" : "bg-secondary"}`}
            >
              <p className="mb-1 text-xs font-semibold opacity-75">
                {message.role === "student" ? "You" : "Challenge"}
              </p>
              <p>{message.text}</p>
            </div>
          ))
        )}
        <form onSubmit={send} className="flex gap-2 border-t border-border pt-4">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share your idea or answer…"
            aria-label="Your idea or answer"
          />
          <Button
            type="submit"
            disabled={!draft.trim()}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Send className="size-4" /> Challenge
          </Button>
        </form>
      </section>
    </AppShell>
  );
}
