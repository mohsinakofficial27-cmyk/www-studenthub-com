import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();
const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("share-note"),
    title: z.string().trim().min(2).max(120),
    subject: z.string().trim().min(1).max(80),
    content: z.string().trim().min(20).max(30000),
  }),
  z.object({
    action: z.literal("post-bounty"),
    subject: z.string().trim().min(1).max(80),
    question: z.string().trim().min(10).max(3000),
    reward: z.number().int().min(3).max(100),
  }),
  z.object({
    action: z.literal("answer-bounty"),
    bountyId: uuid,
    answer: z.string().trim().min(10).max(3000),
  }),
  z.object({ action: z.literal("accept-answer"), bountyId: uuid, answerId: uuid }),
]);

function missingMarketplaceMigration(error: { code?: string; message: string }) {
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code ?? "") ||
    /study_marketplace_(snapshot|action)|study_coin_wallets|study_market_notes|study_doubt_bounties/i.test(
      error.message,
    );
}

export const getMarketplaceSnapshot = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("study_marketplace_snapshot");
    if (error) {
      if (missingMarketplaceMigration(error)) return { configured: false as const };
      console.error("Could not load peer note exchange", error.message);
      throw new Error("Could not load the peer marketplace. Please try again.");
    }
    return { configured: true as const, data };
  });

export const runMarketplaceAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => actionSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { action, ...payload } = data;
    const { data: result, error } = await context.supabase.rpc("study_marketplace_action", {
      _action: action,
      _payload: payload,
    });
    if (error) {
      if (missingMarketplaceMigration(error)) return { configured: false as const };
      console.error(`Peer marketplace action ${action} failed`, error.message);
      throw new Error("That marketplace action could not be completed. Please try again.");
    }
    return { configured: true as const, data: result };
  });
