import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, MessageSquare, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { AI_MODES, type AiMode } from "@/lib/ai";
import { DAILY_AI_LIMIT, askAssistantAI } from "@/lib/ai.functions";
import { useAuth, useDb } from "@/lib/auth";
import { scopedRows } from "@/lib/data";
import { mutate, uid } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/assistant")({
  head: () => ({
    meta: [
      { title: "AI Study Assistant — Student Hub" },
      { name: "description", content: "Ask study questions and get explanations, steps, summaries and self-tests." },
      { property: "og:title", content: "AI Study Assistant — Student Hub" },
      { property: "og:description", content: "Your study questions, answered." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { user } = useAuth();
  const db = useDb();
  const ask = useServerFn(askAssistantAI);
  const [mode, setMode] = useState<AiMode>("explain");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitMsg, setLimitMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("ai_usage").select("count").eq("user_id", user.id).eq("day", today).maybeSingle();
      setRemaining(Math.max(0, DAILY_AI_LIMIT - (data?.count ?? 0)));
    })();
  }, [user]);

  if (!user) return null;
  const conversations = scopedRows(db.ai_conversations, user.id);
  const current = conversations.find((c) => c.id === activeId) ?? conversations[0] ?? null;
  const messages = current ? scopedRows(db.ai_messages, user.id).filter((m) => m.conversation_id === current.id) : [];

  const send = async (question: string, replaceLastAnswer = false) => {
    const text = question.trim();
    if (!text) return;
    setBusy(true);
    let convoId = current?.id ?? "";
    if (!convoId) {
      convoId = uid();
      mutate((d) => {
        d.ai_conversations.unshift({
          id: convoId,
          user_id: user.id,
          title: text.slice(0, 48),
          created_at: new Date().toISOString(),
        });
      });
      setActiveId(convoId);
    }
    if (!replaceLastAnswer) {
      mutate((d) => {
        d.ai_messages.push({
          id: uid(),
          user_id: user.id,
          conversation_id: convoId,
          role: "user",
          content: text,
          mode,
          created_at: new Date().toISOString(),
        });
      });
    }
    try {
      const history = (current ? messages : [])
        .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content.slice(0, 8000) }))
        .filter((m) => m.content.trim());
      if (replaceLastAnswer && history.length && history[history.length - 1]!.role === "assistant") history.pop();
      if (!replaceLastAnswer) history.push({ role: "user", content: text.slice(0, 8000) });
      const result = await ask({ data: { mode, messages: history.slice(-40) } });
      if ("remaining" in result && typeof result.remaining === "number") setRemaining(result.remaining);
      if (!result.ok) {
        if ("limitReached" in result && result.limitReached) setLimitMsg(result.error);
        else toast.error(result.error);
        return;
      }
      mutate((d) => {
        if (replaceLastAnswer) {
          const list = d.ai_messages.filter((m) => m.conversation_id === convoId && m.role === "assistant");
          const last = list[list.length - 1];
          if (last) {
            last.content = result.content;
            return;
          }
        }
        d.ai_messages.push({
          id: uid(),
          user_id: user.id,
          conversation_id: convoId,
          role: "assistant",
          content: result.content,
          mode,
          created_at: new Date().toISOString(),
        });
      });
      setInput("");
    } catch {
      toast.error("The study assistant is unavailable right now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  const lastQuestion = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  return (
    <AppShell
      title="AI Study Assistant"
      description="Pick a mode, ask your question, and work through the answer."
      actions={
        <Button variant="outline" className="gap-2" onClick={() => setActiveId(uid())}>
          <Plus className="size-4" /> New conversation
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {remaining === null
          ? "Checking your daily AI questions…"
          : `${remaining} of ${DAILY_AI_LIMIT} AI questions left today (fair usage limit, resets daily).`}
      </p>
      {limitMsg || remaining === 0 ? (
        <div className="mt-3">
          <InfoNote
            title="Daily limit reached"
            description={limitMsg || `You've used all ${DAILY_AI_LIMIT} AI questions for today. Your limit resets tomorrow.`}
          />
        </div>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[260px_1fr]">
        <div className="panel hidden p-3 lg:block">
          <p className="px-2 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">History</p>
          {conversations.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={cn(
                      "w-full truncate rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-secondary",
                      current?.id === c.id && "bg-brand-soft text-accent-foreground",
                    )}
                  >
                    {c.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel flex min-h-[28rem] flex-col p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            {AI_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  mode === m.id
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border text-muted-foreground hover:border-brand/50",
                )}
              >
                {m.label}
              </button>
            ))}
            {current && messages.length ? (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto gap-1.5 text-muted-foreground"
                onClick={() =>
                  mutate((d) => {
                    d.ai_messages = d.ai_messages.filter((m) => m.conversation_id !== current.id);
                  })
                }
              >
                <Trash2 className="size-4" /> Clear
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
            {messages.length === 0 ? (
              <EmptyState
                className="border-0 bg-transparent"
                icon={MessageSquare}
                title="Ask your first question"
                description="Try: “Explain photosynthesis simply” or “Step-by-step: solve 2x + 5 = 17”."
              />
            ) : (
              messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                      {m.content}
                    </p>
                  </div>
                ) : (
                  <div key={m.id} className="max-w-[92%]">
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    <div className="mt-2 flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-muted-foreground"
                        onClick={() => {
                          void navigator.clipboard?.writeText(m.content);
                          toast.success("Answer copied.");
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
                  if (!busy && input.trim() && remaining !== 0) void send(input);
                }
              }}
              rows={2}
              placeholder="Ask anything about your subjects…"
              className="flex-1 resize-none"
            />
            <Button
              type="submit"
              disabled={busy || !input.trim() || remaining === 0}
              className="bg-brand text-brand-foreground hover:bg-brand/90 sm:self-end"
            >
              {busy ? "Thinking…" : "Ask"}
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
