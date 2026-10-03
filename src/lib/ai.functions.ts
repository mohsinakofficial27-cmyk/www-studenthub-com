import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODE_PROMPTS: Record<string, string> = {
  explain: "Explain the idea simply, in plain language, with one everyday comparison.",
  steps: "Solve or explain step by step, numbering each step and showing the working.",
  exam: "Focus on exam preparation: key definitions, a worked example, common traps and a practice question.",
  summarize: "Summarize concisely: core idea, three key points and one example.",
  quiz: "Quiz the student: ask 3-5 short questions on the topic, then give the answers at the end.",
};

const inputSchema = z.object({
  mode: z.enum(["explain", "steps", "exam", "summarize", "quiz"]),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});

export const DAILY_AI_LIMIT = 15;

export const askAssistantAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "The AI service isn't configured yet." };

    const { data: remaining, error: quotaError } = await context.supabase.rpc("consume_ai_question", {
      _limit: DAILY_AI_LIMIT,
    });
    if (quotaError) return { ok: false as const, error: "Couldn't check your daily limit. Please try again." };
    if ((remaining as number) < 0) {
      return {
        ok: false as const,
        limitReached: true,
        remaining: 0,
        error: `You've used all ${DAILY_AI_LIMIT} AI questions for today. Your limit resets tomorrow — keep studying with your notes, flashcards and quizzes in the meantime!`,
      };
    }

    const input = [
      {
        role: "system",
        content: `You are Student Hub's friendly AI study assistant for students. Be accurate, clear and encouraging. Use short markdown-free formatting (plain text, numbered lists allowed). Never write full assignments for students; explain and guide instead. ${MODE_PROMPTS[data.mode]}`,
      },
      ...data.messages.slice(-20),
    ];

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          input,
          stream: true,
          store: false,
          reasoning: { effort: "low" },
        }),
      });
    } catch {
      return { ok: false as const, error: "Couldn't reach the AI service. Check your connection and try again." };
    }

    if (!res.ok || !res.body) {
      console.error("AI gateway error", res.status, await res.text().catch(() => ""));
      if (res.status === 429) return { ok: false as const, error: "Too many requests right now. Please wait a moment and try again." };
      if (res.status === 402) return { ok: false as const, error: "AI credits have run out. Please add credits to continue." };
      return { ok: false as const, error: "The study assistant is unavailable right now. Please try again shortly." };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let text = "";
    let failed = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload) as { type?: string; delta?: string };
          if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
          if (evt.type === "response.failed" || evt.type === "error") failed = true;
        } catch {
          /* ignore partial */
        }
      }
    }

    if (failed || !text.trim()) {
      return { ok: false as const, error: "The AI couldn't produce an answer. Try rephrasing your question." };
    }
    return { ok: true as const, content: text.trim(), remaining: remaining as number };
  });
