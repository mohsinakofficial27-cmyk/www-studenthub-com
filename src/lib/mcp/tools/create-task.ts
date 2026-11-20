import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { newId, requireUserId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_study_task",
  title: "Create study task",
  description: "Add a study task or exam to the signed-in student's planner.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("What the student will study."),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .describe("Date of the task (YYYY-MM-DD)."),
    time: z
      .string()
      .regex(/^\d{2}:\d{2}$/)
      .optional()
      .describe("Start time (HH:mm, 24h). Defaults to 18:00."),
    subject: z.string().trim().max(80).optional().describe("Subject for the task."),
    topic: z.string().trim().max(120).optional().describe("Specific topic."),
    minutes: z.number().int().min(5).max(600).optional().describe("Planned minutes (default 45)."),
    priority: z.enum(["low", "medium", "high"]).optional().describe("Priority (default medium)."),
    is_exam: z.boolean().optional().describe("Mark this entry as an exam."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, date, time, subject, topic, minutes, priority, is_exam }, ctx) => {
    const userId = requireUserId(ctx);
    const supabase = supabaseForUser(ctx);
    const row = {
      id: newId(),
      user_id: userId,
      title,
      subject: subject ?? "General",
      topic: topic ?? "",
      date,
      time: time ?? "18:00",
      minutes: minutes ?? 45,
      priority: priority ?? "medium",
      done: false,
      is_exam: is_exam ?? false,
    };
    const { error } = await supabase.from("study_tasks").insert(row);
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text" as const, text: `Planned "${title}" for ${date} at ${row.time}.` }],
      structuredContent: {
        task: row.is_exam ? { ...row, user_id: undefined } : { ...row, user_id: undefined },
      },
    };
  },
});
