import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_study_summary",
  title: "Get study summary",
  description:
    "Summarise the signed-in student's recent study activity: minutes studied, quiz scores and open tasks.",
  inputSchema: {
    days: z
      .number()
      .int()
      .min(1)
      .max(90)
      .optional()
      .describe("How many days back to summarise (default 7)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ days }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const window = days ?? 7;
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000).toISOString();

    const [sessions, attempts, tasks] = await Promise.all([
      supabase.from("study_sessions").select("minutes,kind,ended_at").gte("ended_at", since),
      supabase.from("quiz_attempts").select("score,total,taken_at").gte("taken_at", since),
      supabase
        .from("study_tasks")
        .select("id,title,date,is_exam")
        .eq("done", false)
        .order("date", { ascending: true })
        .limit(10),
    ]);
    const firstError = sessions.error ?? attempts.error ?? tasks.error;
    if (firstError) throw new ToolError(firstError.message);

    const focusMinutes = (sessions.data ?? [])
      .filter((s) => s.kind === "focus")
      .reduce((sum, s) => sum + (s.minutes ?? 0), 0);
    const scored = (attempts.data ?? []).filter((a) => (a.total ?? 0) > 0);
    const averageScore = scored.length
      ? Math.round((scored.reduce((sum, a) => sum + a.score / a.total, 0) / scored.length) * 100)
      : null;
    const summary = {
      days: window,
      focus_minutes: focusMinutes,
      quiz_attempts: scored.length,
      average_quiz_percent: averageScore,
      open_tasks: (tasks.data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        date: t.date,
        is_exam: t.is_exam,
      })),
    };
    const text =
      focusMinutes || scored.length || summary.open_tasks.length
        ? JSON.stringify(summary, null, 2)
        : "No study activity yet. Complete your first study session to start building progress.";
    return { content: [{ type: "text" as const, text }], structuredContent: { summary } };
  },
});
