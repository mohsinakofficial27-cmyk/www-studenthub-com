import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth, useDb } from "@/lib/auth";
import { applySubscription, recordBillingNotice } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import type { SubscriptionRow } from "@/lib/store";
import { cancelSubscription, changeSubscriptionPlan } from "@/lib/subscription.functions";


export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({
    meta: [
      { title: "Subscription — Student Hub" },
      { name: "description", content: "See your plan, renewal date and billing history, and change plans." },
      { property: "og:title", content: "Subscription — Student Hub" },
      { property: "og:description", content: "Manage your Student Hub plan." },
    ],
  }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { user } = useAuth();
  const db = useDb();
  if (!user) return null;
  const sub = db.subscriptions.find((s) => s.user_id === user.id);
  const plan = PLANS.find((p) => p.id === (sub?.plan ?? "free"));

  return (
    <AppShell title="Subscription" description="Your plan and billing details.">
      <InfoNote
        title="Test mode — no real payments"
        description="No payment provider is connected, so plan changes here are recorded as test charges and no money moves. Connecting a provider (with its secret key stored server-side) switches this same screen to live billing."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current plan</p>
              <p className="mt-1 font-display text-2xl font-semibold">{plan?.name ?? "Free"}</p>
              <p className="text-sm text-muted-foreground">${plan?.price ?? 0}/month</p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs capitalize text-muted-foreground">
              {sub?.status ?? "active"} · {sub?.mode ?? "test"} mode
            </span>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Started</dt>
              <dd className="mt-1 text-sm">{sub?.started_at || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Renews</dt>
              <dd className="mt-1 text-sm">{sub?.renews_at || "Not applicable on Free"}</dd>
            </div>
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            {PLANS.filter((p) => p.id !== sub?.plan).map((p) => (
              <Button
                key={p.id}
                variant={p.id === "free" ? "outline" : "default"}
                className={p.id === "free" ? "" : "bg-brand text-brand-foreground hover:bg-brand/90"}
                onClick={() => {
                  changePlan(user.id, p.id);
                  toast.success(
                    p.id === "free" ? "Moved to the Free plan." : `Switched to ${p.name} in test mode.`,
                  );
                }}
              >
                {p.id === "free" ? "Switch to Free" : `Upgrade to ${p.name}`}
              </Button>
            ))}
            {sub && sub.plan !== "free" && sub.status === "active" ? (
              <Button
                variant="ghost"
                onClick={() => {
                  cancelPlan(user.id);
                  toast.success("Subscription canceled.");
                }}
              >
                Cancel subscription
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link to="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>

        <div className="panel p-5">
          <h2 className="text-lg font-semibold">Billing history</h2>
          {!sub?.history.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No charges yet. Plan changes will be listed here with their date and amount.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {sub.history.map((h) => (
                <li key={h.id} className="flex items-start justify-between gap-3 text-sm">
                  <div>
                    <p className="font-medium">{h.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.date} · {h.status}
                    </p>
                  </div>
                  <span>${h.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
