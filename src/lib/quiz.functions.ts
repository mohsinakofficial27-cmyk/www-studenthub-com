import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  quizId: z.string().trim().min(1).max(128),
  answers: z.array(z.number().int().min(-1).max(99)).min(1).max(20),
});

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
};

/**
 * Records a quiz attempt. The score is computed by the database function
 * `record_quiz_attempt` from the answers graded against the stored quiz
 * questions, so the client can never save a self-awarded score.
 */
export const recordQuizAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: raw, error } = await (context.supabase as unknown as RpcClient).rpc(
      "record_quiz_attempt",
      { _quiz_id: data.quizId, _answers: data.answers },
    );
    if (error || !raw || typeof raw !== "object") {
      if (error && ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code ?? "")) {
        return {
          ok: false as const,
          setupRequired: true as const,
          error:
            "Quiz history is not configured in Supabase; your current score remains local and was not saved.",
        };
      }
      return { ok: false as const, error: "Couldn't save your attempt. Please try again." };
    }
    const row = raw as Partial<{
      id: string;
      quiz_id: string;
      score: number;
      total: number;
      answers: number[];
      taken_at: string;
    }>;
    if (
      typeof row.id !== "string" ||
      typeof row.quiz_id !== "string" ||
      typeof row.score !== "number" ||
      typeof row.total !== "number" ||
      !Array.isArray(row.answers) ||
      typeof row.taken_at !== "string"
    ) {
      return { ok: false as const, error: "Couldn't save your attempt. Please try again." };
    }
    return {
      ok: true as const,
      attempt: {
        id: row.id,
        user_id: context.userId,
        quiz_id: row.quiz_id,
        score: row.score,
        total: row.total,
        answers: row.answers.map((a) => (typeof a === "number" ? a : -1)),
        taken_at: row.taken_at,
      },
    };
  });
