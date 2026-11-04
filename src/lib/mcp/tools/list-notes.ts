import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const toNoteJson = (row: {
  id: string;
  title: string;
  subject: string;
  content: string;
  summary: string | null;
  favorite: boolean;
  updated_at: string;
}) => ({
  id: row.id,
  title: row.title,
  subject: row.subject,
  content: row.content,
  summary: row.summary ?? "",
  favorite: row.favorite,
  updated_at: row.updated_at,
});

export default defineTool({
  name: "list_notes",
  title: "List notes",
  description: "List the signed-in student's study notes, newest first, with optional text search.",
  inputSchema: {
    search: z.string().trim().optional().describe("Match notes whose title or content contains this text."),
    favorites_only: z.boolean().optional().describe("Return only notes marked as favorite."),
    limit: z.number().int().min(1).max(50).optional().describe("Maximum notes to return (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, favorites_only, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("notes")
      .select("id,title,subject,content,summary,favorite,updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (favorites_only) query = query.eq("favorite", true);
    if (search) {
      // The caller's text must not alter the PostgREST OR-filter syntax:
      // strip the characters PostgREST treats as filter syntax, then cap length.
      const safe = search.replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
      if (safe) query = query.or(`title.ilike.%${safe}%,content.ilike.%${safe}%`);
    }
    const { data, error } = await query;
    if (error) throw new ToolError(error.message);
    const notes = (data ?? []).map(toNoteJson);
    return {
      content: [{ type: "text" as const, text: notes.length ? JSON.stringify(notes, null, 2) : "No notes found." }],
      structuredContent: { notes },
    };
  },
});
