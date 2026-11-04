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

const chatMessage = z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) });
const messageList = z.array(chatMessage).min(1).max(40);

export const DAILY_AI_LIMIT = 15;

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

/* ---------------- gateway helpers (server-side only) ---------------- */

async function openStream(apiKey: string, body: Record<string, unknown>) {
  return fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify(body),
  });
}

/* Consumes one question of the student's daily fair-usage allowance.
   Returns a failure result to return, or { ok: true, remaining } on success. */
async function consumeQuota(context: {
  supabase: {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  };
}): Promise<
  { ok: false; error: string; limitReached?: boolean } | { ok: true; remaining: number }
> {
  const { data: remaining, error: quotaError } = await context.supabase.rpc("consume_ai_question", {
    _limit: DAILY_AI_LIMIT,
  });
  if (quotaError) return { ok: false, error: "Couldn't check your daily limit. Please try again." };
  const left = Number(remaining ?? 0);
  if (left < 0) {
    return {
      ok: false,
      limitReached: true,
      error: `You've used all ${DAILY_AI_LIMIT} AI questions for today. Your limit resets tomorrow — keep studying with your notes, flashcards and quizzes in the meantime!`,
    };
  }
  return { ok: true, remaining: Math.max(left, 0) };
}

async function readStream(res: Response): Promise<StreamOutcome> {
  if (!res.ok || !res.body) {
    console.error("AI gateway error", res.status, await res.text().catch(() => ""));
    if (res.status === 429) return { ok: false, error: "Too many requests right now. Please wait a moment and try again." };
    if (res.status === 402) return { ok: false, error: "AI credits have run out. Please add credits to continue." };
    return { ok: false, error: "The study assistant is unavailable right now. Please try again shortly." };
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
  if (failed || !text.trim()) return { ok: false, error: "The AI couldn't produce an answer. Try rephrasing your question." };
  return { ok: true, text: text.trim() };
}

function parseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    /* model may wrap the JSON in code fences */
  }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

/* ---------------- AI Study Assistant chat ---------------- */

const inputSchema = z.object({
  mode: z.enum(["explain", "steps", "exam", "summarize", "quiz"]),
  messages: messageList,
});

export const askAssistantAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "The AI service isn't configured yet." };

    const quota = await consumeQuota(context);
    if (quota.fail) return quota.result;

    const input = [
      {
        role: "system",
        content: `You are Student Hub's friendly AI study assistant for students. Be accurate, clear and encouraging. Use short markdown-free formatting (plain text, numbered lists allowed). Never write full assignments for students; explain and guide instead. ${MODE_PROMPTS[data.mode]}`,
      },
      // Roles are assigned here, server-side: the caller's history is passed
      // through a fixed mapping and can never introduce a system or
      // instruction role into the model input.
      ...data.messages.slice(-20).map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      })),
    ];

    let res: Response;
    try {
      res = await openStream(apiKey, { model: MODEL, input, stream: true, store: false, reasoning: { effort: "low" } });
    } catch {
      return { ok: false as const, error: "Couldn't reach the AI service. Check your connection and try again." };
    }

    const outcome = await readStream(res);
    if (!outcome.ok) return { ok: false as const, error: outcome.error };
    return { ok: true as const, content: outcome.text, remaining: quota.remaining };
  });

/* ---------------- AI Student Coach ---------------- */

const coachSchema = z.object({
  context: z.string().trim().min(1).max(4000).describe("A short factual summary of the student's schedule."),
  messages: messageList,
});

export const askCoachAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => coachSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "The AI service isn't configured yet." };

    const quota = await consumeQuota(context);
    if (quota.fail) return quota.result;

    const input = [
      {
        role: "system",
        content:
          "You are Student Hub's AI Student Coach. You help students plan their day and week, prepare for exams, prioritize assignments, reschedule missed work, break large assignments into smaller tasks, and build realistic study schedules.\n" +
          "You are given a factual summary of the student's real schedule (tasks, deadlines, exams, study hours). Use ONLY that data when talking about their schedule — never invent exams, deadlines or grades they didn't mention.\n" +
          "Answer with concrete, dated plans like:\n\"Here's your plan:\nToday — 45 min Biology + 30 min Assignment 1\nTomorrow — 60 min Biology + 45 min Assignment 2\".\n" +
          "Keep answers short, plain text (numbered lists allowed), encouraging, and end with one clear next action. Never write full assignments for students.\n\n" +
          `The student's real schedule:\n${data.context}`,
      },
      ...data.messages.slice(-20),
    ];

    let res: Response;
    try {
      res = await openStream(apiKey, { model: MODEL, input, stream: true, store: false, reasoning: { effort: "low" } });
    } catch {
      return { ok: false as const, error: "Couldn't reach the AI service. Check your connection and try again." };
    }

    const outcome = await readStream(res);
    if (!outcome.ok) return { ok: false as const, error: outcome.error };
    return { ok: true as const, content: outcome.text, remaining: quota.remaining };
  });

/* ---------------- AI Notes -> Study System ---------------- */

interface StudyMaterials {
  summary: string;
  key_points: string[];
  flashcards: { front: string; back: string }[];
  questions: { prompt: string; options: string[]; answer: number; explanation: string }[];
}

const noteSchema = z.object({
  title: z.string().trim().max(200).default(""),
  subject: z.string().trim().max(80).default(""),
  content: z.string().trim().min(40).max(20000),
});

const studyMaterialsFormat = {
  type: "json_schema" as const,
  name: "study_materials",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "key_points", "flashcards", "questions"],
    properties: {
      summary: { type: "string", description: "A clear 3-6 sentence summary of the notes." },
      key_points: {
        type: "array",
        maxItems: 8,
        items: { type: "string" },
        description: "The most important takeaways, one short sentence each.",
      },
      flashcards: {
        type: "array",
        maxItems: 15,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["front", "back"],
          properties: {
            front: { type: "string", description: "A question or term." },
            back: { type: "string", description: "The answer or definition." },
          },
        },
      },
      questions: {
        type: "array",
        maxItems: 10,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "options", "answer", "explanation"],
          properties: {
            prompt: { type: "string" },
            options: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" } },
            answer: { type: "integer", minimum: 0, maximum: 3, description: "Index of the correct option." },
            explanation: { type: "string" },
          },
        },
      },
    },
  },
};

export const generateNoteStudy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => noteSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "The AI service isn't configured yet." };

    const quota = await consumeQuota(context);
    if (quota.fail) return quota.result;

    const input = [
      {
        role: "system",
        content:
          "You turn a student's study notes into a study system. From the notes below, produce: a summary, key points, flashcards (front = term/question, back = answer), and multiple-choice questions for self-testing. Base everything strictly on the note content — do not invent facts the notes don't support.",
      },
      {
        role: "user",
        content: `Title: ${data.title || "Untitled"}\nSubject: ${data.subject || "General"}\n\nNotes:\n${data.content.slice(0, 18000)}`,
      },
    ];

    let res: Response;
    try {
      res = await openStream(apiKey, {
        model: MODEL,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: studyMaterialsFormat },
      });
    } catch {
      return { ok: false as const, error: "Couldn't reach the AI service. Check your connection and try again." };
    }

    const outcome = await readStream(res);
    if (!outcome.ok) return { ok: false as const, error: outcome.error };
    const parsed = parseJson<StudyMaterials>(outcome.text);
    if (!parsed || !Array.isArray(parsed.flashcards) || !Array.isArray(parsed.questions)) {
      return { ok: false as const, error: "The AI couldn't process these notes. Try again with clearer notes." };
    }
    return {
      ok: true as const,
      summary: String(parsed.summary ?? ""),
      key_points: parsed.key_points.filter((k) => typeof k === "string").slice(0, 8),
      flashcards: parsed.flashcards
        .filter((c) => c && typeof c.front === "string" && typeof c.back === "string")
        .slice(0, 15),
      questions: parsed.questions
        .filter((q) => q && typeof q.prompt === "string" && Array.isArray(q.options) && q.options.length >= 3)
        .map((q) => ({
          prompt: q.prompt,
          options: q.options.slice(0, 4),
          answer: Math.min(Math.max(Number(q.answer) || 0, 0), Math.min(q.options.length, 4) - 1),
          explanation: String(q.explanation ?? ""),
        }))
        .slice(0, 10),
      remaining: quota.remaining,
    };
  });

/* ---------------- AI Quiz Generator ---------------- */

const quizRequestSchema = z.object({
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().max(120).default(""),
  difficulty: z.enum(["easy", "medium", "hard"]),
  count: z.number().int().min(3).max(20),
});

const quizFormat = {
  type: "json_schema" as const,
  name: "quiz_questions",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["questions"],
    properties: {
      questions: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "options", "answer", "explanation"],
          properties: {
            prompt: { type: "string" },
            options: { type: "array", minItems: 3, maxItems: 4, items: { type: "string" } },
            answer: { type: "integer", minimum: 0, maximum: 3 },
            explanation: { type: "string" },
          },
        },
      },
    },
  },
};

export const generateQuizAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => quizRequestSchema.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, error: "The AI service isn't configured yet." };

    const quota = await consumeQuota(context);
    if (quota.fail) return quota.result;

    const input = [
      {
        role: "system",
        content:
          "You write multiple-choice practice questions for students. Each question has one clearly correct answer and a short explanation. Match the requested difficulty and stay strictly on the requested subject and topic.",
      },
      {
        role: "user",
        content: `Subject: ${data.subject}\nTopic: ${data.topic || "(general)"}\nDifficulty: ${data.difficulty}\nWrite exactly ${data.count} multiple-choice questions.`,
      },
    ];

    let res: Response;
    try {
      res = await openStream(apiKey, {
        model: MODEL,
        input,
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: { format: quizFormat },
      });
    } catch {
      return { ok: false as const, error: "Couldn't reach the AI service. Check your connection and try again." };
    }

    const outcome = await readStream(res);
    if (!outcome.ok) return { ok: false as const, error: outcome.error };
    const parsed = parseJson<{ questions: StudyMaterials["questions"] }>(outcome.text);
    if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return { ok: false as const, error: "The AI couldn't build that quiz. Try a different topic." };
    }
    return {
      ok: true as const,
      questions: parsed.questions
        .filter((q) => q && typeof q.prompt === "string" && Array.isArray(q.options) && q.options.length >= 3)
        .map((q) => ({
          prompt: q.prompt,
          options: q.options.slice(0, 4),
          answer: Math.min(Math.max(Number(q.answer) || 0, 0), Math.min(q.options.length, 4) - 1),
          explanation: String(q.explanation ?? ""),
        }))
        .slice(0, data.count),
      remaining: quota.remaining,
    };
  });
