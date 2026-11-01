import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, GraduationCap, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askCoachAI } from "@/lib/ai.functions";
import { useAuth, useDb } from "@/lib/auth";
import { computeStats, scopedRows } from "@/lib/data";
import { todayISO } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI Student Coach — Student Hub" },
      { name: "description", content: "Your AI coach turns your real schedule into a day-by-day study plan, prioritizes deadlines and preps you for exams." },
      { property: "og:title", content: "AI Student Coach — Student Hub" },
      { property: "og:description", content: "A study plan built around your real schedule." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachPage,
});

const STARTERS = [
  "Plan my day around what's due.",
  "Help me prepare for my next exam.",
  "I fell behind this week — help me catch up.",
  "Break my biggest assignment into smaller tasks.",
];

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function CoachPage() {
  const { user, profile } = useAuth();
  const db = useDb();
  const ask = useServerFn(askCoachAI);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [limitMsg, setLimitMsg] = useState("");

  if (!user) return null;

  const tasks = scopedRows(db.study_tasks, user.id);
  const stats = computeStats(db, user.id);
  const today = todayISO();

  // Factual schedule summary from the student's real data — the coach uses only this.
  const context = [
    `Today is ${today}. Student level: ${profile?.grade || "not set"}. Subjects: ${(profile?.subjects ?? []).join(", ") || "not set"}. Goal: ${profile?.goals || "not set"}. Daily study hours target: ${profile?.daily_hours ?? "not set"}. Current streak: ${stats.streak} days.`,
    tasks.length
      ? `Scheduled tasks (date | time | subject | title | priority | done?): ${tasks
          .slice(0, 40)
          .map((t) => `${t.date} ${t.time} | ${t.subject} | ${t.title} | ${t.priority}${t.is_exam ? " | EXAM" : ""} | ${t.done ? "done" : "open"}`)
          .join(" ;; ")}`
      : "No tasks scheduled yet.",
    `Study time so far: ${stats.totalHours}h total, ${stats.weekHours}h in the last 7 days. Quiz average: ${stats.quizAverage ? `${stats.quizAverage}%` : "no attempts"}.`,
  ].join("\n");

  const send = async (question: string, replaceLastAnswer = false) => {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    const history = replaceLastAnswer ? messages.slice(0, -1) : [...messages, { role: "user" as const, content: text }];
    if (!replaceLastAnswer) setMessages(history);
    try {
      const result = await ask({
        data: { context, messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })) },
      });
      if (!result.ok) {
        if ("limitReached" in result && result.limitReached) setLimitMsg(result.error);
        else toast.error(result.error);
        if (replaceLastAnswer) setMessages(history);
        return;
      }
      setMessages([...history, { role: "assistant", content: result.content }]);
      setInput("");
    } catch {
      toast.error("The AI coach is unavailable right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return (
    <AppShell
      title="AI Student Coach"
      description="The coach reads your real schedule — tasks, deadlines, exams — and builds the plan with you."
    >
      {limitMsg ? (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm text-muted-foreground">{limitMsg}</p>
      ) : null}

      <div className="panel flex min-h-[32rem] flex-col p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand" />
          <p className="text-sm font-medium">Coach session</p>
          {messages.length ? (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto gap-1.5 text-muted-foreground"
              onClick={() => setMessages([])}
            >
              Clear
            </Button>
          ) : null}
        </div>

        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div>
              <EmptyState
                className="border-0 bg-transparent"
                icon={GraduationCap}
                title="Tell the coach what's going on"
                description="It already knows your scheduled tasks, exams and study hours — just say what you need."
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void send(s)}
                    disabled={busy}
                    className={cn(
                      "rounded-xl border border-border px-3.5 py-2.5 text-left text-sm transition-colors hover:border-brand/50 hover:bg-brand-soft/40",
                      busy && "opacity-50",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                    {m.content}
                  </p>
                </div>
              ) : (
                <div key={i} className="max-w-[92%]">
                  <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                  <div className="mt-2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-muted-foreground"
                      onClick={() => {
                        void navigator.clipboard?.writeText(m.content);
                        toast.success("Plan copied.");
                      }}
                    >
                      <Copy className="size-3.5" /> Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-xs text-muted-foreground"
                      disabled={busy || !lastQuestion}
                      onClick={() => void send(lastQuestion, true)}
                    >
                      <RefreshCw className="size-3.5" /> Regenerate
                    </Button>
                  </div>
                </div>
              ),
            )
          )}
          {busy ? <p className="text-sm text-muted-foreground">Your coach is thinking…</p> : null}
        </div>

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="e.g. I have a Biology exam Friday and two assignments due Thursday."
            className="flex-1 resize-none"
          />
          <Button
            type="submit"
            disabled={busy || !input.trim()}
            className="bg-brand text-brand-foreground hover:bg-brand/90 sm:self-end"
          >
            {busy ? "Thinking…" : "Ask coach"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
