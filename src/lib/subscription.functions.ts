/**
 * Subscription entitlement — server-side only.
 *
 * The browser may never decide which plan an account is on: the database
 * revokes write access to `subscriptions` from signed-in users, and every
 * change goes through these authenticated server functions, which derive the
 * plan, status, dates and billing history themselves.
 *
 * A paid plan is only ever granted after a verified purchase. Until a payment
 * provider is connected (its secret key stored as a server-side secret, e.g.
 * STRIPE_SECRET_KEY), upgrade requests are refused instead of being self-granted.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planSchema = z.object({ plan: z.enum(["free", "student", "pro"]) });

function paymentsConfigured() {
  return Boolean(process.env["STRIPE_SECRET_KEY"] || process.env["PADDLE_API_KEY"]);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data, context }) => {
    const userId = context.userId;

    if (data.plan !== "free" && !paymentsConfigured()) {
      throw new Error(
        "Upgrades are unavailable until a payment provider is connected. A paid plan can only be granted after a verified payment.",
      );
    }

    const admin = await adminClient();
    const { data: existing, error: readError } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (readError) throw new Error("Could not load your subscription.");

    const renew = new Date();
    renew.setMonth(renew.getMonth() + 1);

    const row = {
      user_id: userId,
      plan: data.plan,
      status: "active",
      mode: paymentsConfigured() ? "live" : "test",
      started_at: todayISO(),
      renews_at: data.plan === "free" ? "" : renew.toISOString().slice(0, 10),
      history: (existing?.history as unknown[] | null) ?? [],
    };

    const { data: saved, error } = await admin
      .from("subscriptions")
      .upsert(row, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw new Error("Could not update your subscription.");

    return saved;
  });

export const cancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const admin = await adminClient();
    const { data: saved, error } = await admin
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw new Error("Could not cancel your subscription.");
    return saved;
  });
