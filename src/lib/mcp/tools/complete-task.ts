import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "complete_study_task",
  title: "Complete study task",
  description: "Mark one of the signed-in student's study tasks as done (or not done).",
  inputSchema: {
    task_id: z
      .string()
      .trim()
      .min(1)
      .describe("The id of the task, as returned by list_study_tasks."),
    done: z.boolean().optional().describe("Set to false to reopen the task. Defaults to true."),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ task_id, done }, ctx) => {
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("study_tasks")
      .update({ done: done ?? true })
      .eq("id", task_id)
      .select("id,title,done");
    if (error) throw new ToolError(error.message);
    if (!data || data.length === 0) throw new ToolError(`No task found with id "${task_id}".`);
    const task = data[0]!;
    return {
      content: [
        {
          type: "text" as const,
          text: `"${task.title}" is now ${task.done ? "complete" : "open"}.`,
        },
      ],
      structuredContent: { task: { id: task.id, title: task.title, done: task.done } },
    };
  },
});
