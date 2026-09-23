import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const toTaskJson = (row: {
  id: string;
  title: string;
  subject: string;
  topic: string;
  date: string;
  time: string;
  minutes: number;
  priority: string;
  done: boolean;
  is_exam: boolean;
}) => ({ ...row });

export default defineTool({
  name: "list_study_tasks",
  title: "List study tasks",
  description: "List the signed-in student's planned study tasks and exams.",
  inputSchema: {
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Only tasks on or after this date (YYYY-MM-DD)."),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Only tasks on or before this date (YYYY-MM-DD)."),
    include_done: z.boolean().optional().describe("Include completed tasks (default false)."),
    exams_only: z.boolean().optional().describe("Return only tasks flagged as exams."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum tasks to return (default 30)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ from_date, to_date, include_done, exams_only, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("study_tasks")
      .select("id,title,subject,topic,date,time,minutes,priority,done,is_exam")
      .order("date", { ascending: true })
      .limit(limit ?? 30);
    if (from_date) query = query.gte("date", from_date);
    if (to_date) query = query.lte("date", to_date);
    if (!include_done) query = query.eq("done", false);
    if (exams_only) query = query.eq("is_exam", true);
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const tasks = (data ?? []).map(toTaskJson);
    return {
      content: [{ type: "text" as const, text: tasks.length ? JSON.stringify(tasks, null, 2) : "No matching tasks." }],
      structuredContent: { tasks },
    };
  },
});
