import { createFileRoute } from "@tanstack/react-router";

import { SectionHeading } from "@/components/brand";
import { FreePlanCard } from "@/components/launch";
import { SitePage } from "@/components/site-layout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Free Plan — Student Hub" },
      { name: "description", content: "Student Hub is 100% free while we launch. Every study tool included." },
      { property: "og:title", content: "Free Plan — Student Hub" },
      { property: "og:description", content: "All Student Hub study tools, free during launch." },
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
        <SectionHeading
          as="h1"
          eyebrow="Free Plan"
          title="Free during launch"
          subtitle="100% free while we launch. Every study tool is included."
        />
        <FreePlanCard />
      </section>
    </SitePage>
  );
}
