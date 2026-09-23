import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { newId, nowIso, requireUserId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_note",
  title: "Create note",
  description: "Save a new study note for the signed-in student.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("Note title."),
    content: z.string().trim().min(1).describe("Note body text."),
    subject: z.string().trim().max(80).optional().describe("Subject the note belongs to."),
    summary: z.string().trim().max(2000).optional().describe("Optional short summary of the note."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ title, content, subject, summary }, ctx) => {
    const userId = requireUserId(ctx);
    const supabase = supabaseForUser(ctx);
    const stamp = nowIso();
    const row = {
      id: newId(),
      user_id: userId,
      title,
      content,
      subject: subject ?? "General",
      favorite: false,
      summary: summary ?? null,
      key_points: [],
      created_at: stamp,
      updated_at: stamp,
    };
    const { error } = await supabase.from("notes").insert(row);
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text" as const, text: `Created note "${title}".` }],
      structuredContent: { note: { id: row.id, title, subject: row.subject, updated_at: stamp } },
    };
  },
});
