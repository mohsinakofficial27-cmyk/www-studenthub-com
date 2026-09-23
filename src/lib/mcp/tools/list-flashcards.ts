import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_flashcards",
  title: "List flashcards",
  description: "List the signed-in student's flashcard decks, or the cards inside one deck.",
  inputSchema: {
    deck_id: z.string().trim().min(1).optional().describe("Return the cards in this deck instead of the deck list."),
    limit: z.number().int().min(1).max(100).optional().describe("Maximum rows to return (default 50)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ deck_id, limit }, ctx) => {
    const supabase = supabaseForUser(ctx);
    if (deck_id) {
      const { data, error } = await supabase
        .from("flashcards")
        .select("id,deck_id,front,back,confidence")
        .eq("deck_id", deck_id)
        .limit(limit ?? 50);
      if (error) throw new ToolError(error.message);
      const cards = (data ?? []).map((c) => ({ id: c.id, deck_id: c.deck_id, front: c.front, back: c.back, confidence: c.confidence }));
      return {
        content: [{ type: "text" as const, text: cards.length ? JSON.stringify(cards, null, 2) : "This deck has no cards yet." }],
        structuredContent: { cards },
      };
    }
    const { data, error } = await supabase
      .from("flashcard_decks")
      .select("id,name,subject,created_at")
      .limit(limit ?? 50);
    if (error) throw new ToolError(error.message);
    const decks = (data ?? []).map((d) => ({ id: d.id, name: d.name, subject: d.subject, created_at: d.created_at }));
    return {
      content: [{ type: "text" as const, text: decks.length ? JSON.stringify(decks, null, 2) : "No flashcard decks yet." }],
      structuredContent: { decks },
    };
  },
});
