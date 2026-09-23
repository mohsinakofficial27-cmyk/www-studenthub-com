import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { newId, nowIso, requireUserId, supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_flashcards",
  title: "Create flashcards",
  description: "Add flashcards for the signed-in student, either to an existing deck or to a new deck.",
  inputSchema: {
    deck_id: z.string().trim().min(1).optional().describe("Existing deck id. Omit to create a new deck."),
    deck_name: z.string().trim().min(1).max(120).optional().describe("Name for the new deck (required when deck_id is omitted)."),
    subject: z.string().trim().max(80).optional().describe("Subject for a newly created deck."),
    cards: z
      .array(z.object({ front: z.string().trim().min(1), back: z.string().trim().min(1) }))
      .min(1)
      .max(50)
      .describe("The cards to add, each with a front (prompt) and back (answer)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ deck_id, deck_name, subject, cards }, ctx) => {
    const userId = requireUserId(ctx);
    const supabase = supabaseForUser(ctx);
    let targetDeck = deck_id;
    if (!targetDeck) {
      if (!deck_name) throw new ToolError("Provide deck_name when deck_id is omitted.");
      const deck = {
        id: newId(),
        user_id: userId,
        name: deck_name,
        subject: subject ?? "General",
        created_at: nowIso(),
      };
      const { error } = await supabase.from("flashcard_decks").insert(deck);
      if (error) throw new ToolError(error.message);
      targetDeck = deck.id;
    }
    const rows = cards.map((c) => ({
      id: newId(),
      user_id: userId,
      deck_id: targetDeck!,
      front: c.front,
      back: c.back,
      confidence: "unrated",
    }));
    const { error } = await supabase.from("flashcards").insert(rows);
    if (error) throw new ToolError(error.message);
    return {
      content: [{ type: "text" as const, text: `Added ${rows.length} card(s) to deck ${targetDeck}.` }],
      structuredContent: { deck_id: targetDeck, added: rows.length },
    };
  },
});
