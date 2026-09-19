import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Layers,
  ListChecks,
  MessageSquare,
  Timer,
  TrendingUp,
} from "lucide-react";

import { SectionHeading } from "@/components/brand";
import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Hub — Study Smarter. Achieve More." },
      {
        name: "description",
        content:
          "AI-powered study tools, notes, quizzes, planning and productivity in one platform built for students.",
      },
      { property: "og:title", content: "Student Hub — Study Smarter. Achieve More." },
      {
        property: "og:description",
        content: "Notes, quizzes, flashcards, planning and focus sessions in one student platform.",
      },
    ],
  }),
  component: Home,
});

const FEATURES = [
  { icon: MessageSquare, title: "AI Study Assistant", body: "Ask questions and work through hard ideas step by step." },
  { icon: BookOpen, title: "AI Notes", body: "Write, summarise and turn notes into study material." },
  { icon: ListChecks, title: "Quiz Generator", body: "Multiple-choice sets by subject, topic and difficulty." },
  { icon: CalendarDays, title: "Study Planner", body: "Schedule subjects, tasks and exams, then track completion." },
  { icon: Layers, title: "Flashcards", body: "Build decks, practise, and rate each card easy to hard." },
  { icon: Timer, title: "Pomodoro Timer", body: "Focus and break sessions, logged into your study history." },
];

function Home() {
  return (
    <SitePage>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="rise">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-accent-foreground">
            <span className="size-1.5 rounded-full bg-brand" />
            Everything You Need to Study Smarter
          </span>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.05] text-balance sm:text-6xl">
            Study Smarter. Achieve More.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted-foreground">
            Student Hub brings AI-powered study tools, notes, quizzes, planning and productivity into one simple
            platform.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to="/signup">Start for Free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/features">Explore Features</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Free plan, no card required.</p>
        </div>

        {/* Dashboard preview */}
        <div className="rise panel p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Your dashboard</p>
              <p className="font-display text-xl font-semibold">Today at a glance</p>
            </div>
            <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-accent-foreground">
              Study streak
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { label: "Today's progress", value: "68%" },
              { label: "Study time", value: "2h 40m" },
              { label: "Quiz average", value: "82%" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface p-3">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 font-display text-xl font-semibold">{s.value}</p>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Today's tasks</p>
          <div className="mt-2 space-y-1.5">
            {[
              { label: "Mathematics — integration", done: true },
              { label: "English — essay outline", done: true },
              { label: "Science — lab review", done: false },
            ].map((t) => (
              <div key={t.label} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5">
                <CheckCircle2 className={t.done ? "size-4 text-brand" : "size-4 text-muted-foreground/40"} />
                <span className="text-sm">{t.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-primary p-3 text-primary-foreground">
              <p className="text-[11px] opacity-70">AI Assistant</p>
              <p className="mt-1 text-sm leading-snug">“Explain the chain rule step by step.”</p>
            </div>
            <div className="rounded-xl bg-brand-soft p-3">
              <p className="text-[11px] text-accent-foreground/70">Upcoming exam</p>
              <p className="mt-1 text-sm font-medium">Calculus II</p>
              <p className="font-mono text-xs text-muted-foreground">in 12 days</p>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-muted-foreground">
            Example view. Your own dashboard starts empty and fills up as you study.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading
            eyebrow="One platform"
            title="Every study tool on one desk"
            subtitle="Tools that sit close together, so your focus stays in one place."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-border bg-background p-5">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Button asChild variant="outline">
              <Link to="/features">
                See all features <ArrowRight className="ml-1 size-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Progress strip */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Progress tracking"
              title="See the work adding up"
              subtitle="Study hours, completed tasks, quiz scores and streaks — all measured from what you actually do in the app. No invented numbers."
            />
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              {["Study hours and weekly trend", "Tasks completed", "Quiz averages by subject", "Current and best streak"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-brand" /> {item}
                  </li>
                ),
              )}
            </ul>
            <Button asChild className="mt-7 bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to="/signup">Create your free account</Link>
            </Button>
          </div>
          <div className="panel p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="size-5 text-brand" />
              <p className="font-semibold">Weekly study time</p>
            </div>
            <div className="mt-6 flex h-40 items-end gap-3">
              {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1">
                  <div className="rounded-t-lg bg-brand/80" style={{ height: `${h}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <SectionHeading eyebrow="Pricing" title="Simple plans, student prices" />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={
                  plan.featured
                    ? "rounded-2xl border-2 border-brand bg-background p-6"
                    : "rounded-2xl border border-border bg-background p-6"
                }
              >
                <p className="font-display text-lg font-semibold">{plan.name}</p>
                <p className="mt-1 text-3xl font-semibold">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/month</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                <Button
                  asChild
                  className={plan.featured ? "mt-5 w-full bg-brand text-brand-foreground hover:bg-brand/90" : "mt-5 w-full"}
                  variant={plan.featured ? "default" : "outline"}
                >
                  <Link to="/pricing">{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SitePage>
  );
}
