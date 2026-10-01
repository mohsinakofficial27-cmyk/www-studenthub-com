import { Link, createFileRoute } from "@tanstack/react-router";
import {
  BookOpen,
  CalendarDays,
  Layers,
  ListChecks,
  MessageSquare,
  Timer,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { SectionHeading } from "@/components/brand";
import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "Features — Student Hub" },
      {
        name: "description",
        content:
          "AI study assistant, AI notes, quiz generator, study planner, flashcards, pomodoro and progress tracking.",
      },
      { property: "og:title", content: "Features — Student Hub" },
      { property: "og:description", content: "Every Student Hub study tool, explained." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeaturesPage,
});

const FEATURES: { icon: LucideIcon; title: string; points: string[] }[] = [
  {
    icon: MessageSquare,
    title: "AI Study Assistant",
    points: ["Ask questions", "Get explanations", "Simplify difficult concepts", "Step-by-step learning"],
  },
  {
    icon: BookOpen,
    title: "AI Notes",
    points: ["Create notes", "Summarise content", "Organise notes", "Turn notes into study material"],
  },
  {
    icon: ListChecks,
    title: "Quiz Generator",
    points: ["Generate quizzes", "Multiple choice questions", "Difficulty levels", "Track scores"],
  },
  {
    icon: CalendarDays,
    title: "Study Planner",
    points: ["Create study schedules", "Add subjects", "Add exams", "Daily tasks", "Track completion"],
  },
  { icon: Layers, title: "Flashcards", points: ["Create flashcards", "Generated flashcards from notes", "Practice mode"] },
  { icon: Timer, title: "Pomodoro Timer", points: ["Focus sessions", "Break sessions", "Study tracking"] },
  {
    icon: TrendingUp,
    title: "Progress Tracking",
    points: ["Study hours", "Completed tasks", "Quiz scores", "Study streak"],
  },
];

function FeaturesPage() {
  return (
    <SitePage>
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading
          as="h1"
          eyebrow="Features"
          title="Built around how students actually study"
          subtitle="Each tool saves its results to your account, so your dashboard and progress reflect real work."
        />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, points }) => (
            <div key={title} className="panel p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/signup">Start for Free</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/study-tools">Browse study tools</Link>
          </Button>
        </div>
      </section>
    </SitePage>
  );
}
