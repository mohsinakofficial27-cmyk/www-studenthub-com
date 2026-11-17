import { Link, createFileRoute } from "@tanstack/react-router";

import { SectionHeading } from "@/components/brand";
import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Student Hub" },
      { name: "description", content: "Why Student Hub exists and how it handles your study data." },
      { property: "og:title", content: "About — Student Hub" },
      { property: "og:description", content: "One calm workspace instead of six scattered study apps." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <SitePage>
      <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <SectionHeading as="h1" eyebrow="About" title="One workspace instead of six tabs" />
        <div className="mt-8 space-y-5 text-muted-foreground">
          <p>
            Most students juggle a notes app, a calendar, a timer, a flashcard app and a chat assistant that knows
            nothing about any of them. Student Hub puts those in one place so your notes, quizzes, plan and focus
            sessions all feed the same progress picture.
          </p>
          <p>
            The platform is built to be honest about what it knows. Your dashboard and analytics start empty and only
            show numbers produced by work you actually did — no sample statistics dressed up as your own.
          </p>
          <h3 className="pt-2 text-xl font-semibold text-foreground">Your data</h3>
          <p>
            Study content is private to your account. Passwords are never stored as plain text, and any keys for
            external services live server-side only — never in the pages your browser downloads.
          </p>
          <h3 className="pt-2 text-xl font-semibold text-foreground">Current status</h3>
          <p>
            All Student Hub features are available to every registered user at no charge. AI features use an external
            AI service and are subject to its availability and the app's fair-use limits; operating that service may
            incur costs for Student Hub.
          </p>
        </div>
        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/signup">Start for Free</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/pricing">See free features</Link>
          </Button>
        </div>
      </section>
    </SitePage>
  );
}
