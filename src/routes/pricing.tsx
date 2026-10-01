import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/brand";
import { InfoNote } from "@/components/empty-state";
import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { applySubscription, recordBillingNotice } from "@/lib/data";
import { PLANS } from "@/lib/plans";
import type { SubscriptionRow } from "@/lib/store";
import { changeSubscriptionPlan } from "@/lib/subscription.functions";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Student Hub" },
      { name: "description", content: "Free, Student at $10/month and Pro at $20/month. Student pricing, no surprises." },
      { property: "og:title", content: "Pricing — Student Hub" },
      { property: "og:description", content: "Free, Student ($10/mo) and Pro ($20/mo) plans." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const requestPlan = useServerFn(changeSubscriptionPlan);

  const choose = (planId: "free" | "student" | "pro") => {
    if (!user) {
      void navigate({ to: "/signup" });
      return;
    }
    void (async () => {
      try {
        const saved = (await requestPlan({ data: { plan: planId } })) as unknown as SubscriptionRow;
        applySubscription(user.id, saved);
        recordBillingNotice(
          user.id,
          planId === "free" ? "Moved to the Free plan" : "Plan updated",
          planId === "free" ? "You are on the Free plan." : "Your plan was updated.",
        );
        toast.success(planId === "free" ? "You're on the Free plan." : "Plan updated.");
        void navigate({ to: "/subscription" });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not change your plan.");
      }
    })();
  };


  return (
    <SitePage>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading
          as="h1"
          eyebrow="Pricing"
          title="Plans that fit a student budget"
          subtitle="Start free. Upgrade when you need higher AI limits and the advanced study tools."
        />

        <div className="mt-10 grid items-start gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-3xl border bg-card p-6",
                plan.featured && "border-2 border-brand shadow-lg lg:-mt-3 lg:pb-9",
                plan.premium && "border-primary/30 bg-primary text-primary-foreground",
                !plan.featured && !plan.premium && "border-border",
              )}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">
                  Most popular
                </span>
              ) : null}
              {plan.premium ? (
                <span className="absolute -top-3 left-6 rounded-full bg-warning px-3 py-1 text-xs font-medium text-warning-foreground">
                  Premium
                </span>
              ) : null}
              <p className="font-display text-xl font-semibold">{plan.name}</p>
              <p className={cn("mt-1 text-sm", plan.premium ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {plan.tagline}
              </p>
              <p className="mt-5 text-4xl font-semibold">
                ${plan.price}
                <span
                  className={cn(
                    "text-base font-normal",
                    plan.premium ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  /month
                </span>
              </p>
              <Button
                onClick={() => choose(plan.id)}
                className={cn(
                  "mt-6 w-full",
                  plan.featured && "bg-brand text-brand-foreground hover:bg-brand/90",
                  plan.premium && "bg-brand-foreground text-primary hover:bg-brand-foreground/90",
                )}
                variant={plan.featured || plan.premium ? "default" : "outline"}
              >
                {plan.cta}
              </Button>
              <ul className="mt-6 space-y-2.5 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className={cn("mt-0.5 size-4 shrink-0", plan.premium ? "text-warning" : "text-brand")} />
                    <span className={plan.premium ? "text-primary-foreground/90" : "text-muted-foreground"}>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 max-w-3xl">
          <InfoNote
            title="Billing runs in test mode"
            description={
              <>
                No payment provider is connected yet, so upgrades change your plan in the app without taking money. To
                go live, connect a payment provider and set its secret key as a server-side environment variable — it
                must never be placed in the front-end code.{" "}
                <Link to="/subscription" className="font-medium text-foreground underline">
                  See your subscription
                </Link>
                .
              </>
            }
          />
        </div>
      </section>
    </SitePage>
  );
}
