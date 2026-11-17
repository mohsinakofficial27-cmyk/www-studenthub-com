import { createClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const permanentlyDeleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ password: z.string().min(1).max(256) }).parse(data))
  .handler(async ({ data, context }) => {
    const url = process.env["SUPABASE_URL"];
    const publishableKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const email = context.claims["email"];
    if (!url || !publishableKey || !serviceRoleKey) {
      throw new Error("Account deletion is not configured. Please contact support.");
    }
    if (typeof email !== "string") {
      throw new Error("Could not verify the account email. Please sign in again.");
    }

    const verifier = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: verified, error: verifyError } = await verifier.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (verifyError || verified.user?.id !== context.userId) {
      throw new Error("Password confirmation failed.");
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await admin.auth.admin.deleteUser(context.userId);
    if (error) {
      console.error("Could not delete the authenticated account", error.message);
      throw new Error("Account deletion failed. Your data has not been confirmed deleted.");
    }
    return { ok: true as const };
  });
