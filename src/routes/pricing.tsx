import { Link, createFileRoute } from "@tanstack/react-router";

import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Free Student Features — Student Hub" },
      {
        name: "description",
        content:
          "All Student Hub features are free for every registered user. No plans or feature paywalls.",
      },
      { property: "og:title", content: "All Student Hub Features Are Free" },
      {
        property: "og:description",
        content: "Every Student Hub feature is available to every registered user.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <SitePage>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-3xl py-10 text-center">
          <p className="text-sm font-semibold tracking-wide text-brand uppercase">
            Free for everyone
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
            All Student Hub Features Are Free.
          </h1>
          <p className="mt-4 text-muted-foreground">
            Every feature is available to every registered user. There are no paid plans,
            subscriptions, or feature paywalls. AI features rely on an external AI service, have a
            shared fair-use limit, and may incur operating costs for Student Hub. Users are not
            charged through the app.
          </p>
          <Button asChild className="mt-7 bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/signup">Create a free account</Link>
          </Button>
        </div>
      </section>
    </SitePage>
  );
}
