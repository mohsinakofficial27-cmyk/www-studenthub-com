import { Link, createFileRoute } from "@tanstack/react-router";
import { BookOpen, CalendarDays, Layers, ListChecks, MessageSquare, Timer, TrendingUp } from "lucide-react";

import { SectionHeading } from "@/components/brand";
import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/study-tools")({
  head: () => ({
    meta: [
      { title: "Study Tools — Student Hub" },
      {
        name: "description",
        content: "Open the assistant, notes, quizzes, planner, flashcards, pomodoro timer and progress analytics.",
      },
      { property: "og:title", content: "Study Tools — Student Hub" },
      { property: "og:description", content: "Seven tools, one study workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudyToolsPage,
});

const TOOLS = [
  { icon: MessageSquare, title: "AI Study Assistant", body: "Explain simply, step-by-step, exam prep, summarise or quiz me.", to: "/assistant" },
  { icon: BookOpen, title: "AI Notes", body: "Write or paste text, summarise it, pull key points, make cards or a quiz.", to: "/notes" },
  { icon: ListChecks, title: "Quiz Generator", body: "Pick subject, topic, difficulty and length, then sit the quiz.", to: "/quizzes" },
  { icon: CalendarDays, title: "Study Planner", body: "Day, week and month views with priorities and exam dates.", to: "/planner" },
  { icon: Layers, title: "Flashcards", body: "Decks, practice mode and easy/medium/hard confidence rating.", to: "/flashcards" },
  { icon: Timer, title: "Pomodoro", body: "Custom focus and break lengths, with every session logged.", to: "/pomodoro" },
  { icon: TrendingUp, title: "Progress", body: "Hours, tasks, quiz scores, streaks and subject performance.", to: "/progress" },
] as const;

function StudyToolsPage() {
  return (
    <SitePage>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading
          as="h1"
          eyebrow="Study tools"
          title="Open a tool and get to work"
          subtitle="Sign in to use these — everything you create is saved to your own account."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map(({ icon: Icon, title, body, to }) => (
            <Link key={title} to={to} className="panel group p-5 transition-shadow hover:shadow-md">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold group-hover:text-accent-foreground">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </Link>
          ))}
        </div>
        <div className="mt-10">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/signup">Create a free account</Link>
          </Button>
        </div>
      </section>
    </SitePage>
  );
}
