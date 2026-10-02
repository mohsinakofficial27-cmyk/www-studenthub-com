import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  ListChecks,
  MessageSquare,
  Play,
  Quote,
  Target,
  Timer,
} from "lucide-react";
import { useState } from "react";

import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Hub — Study Smarter. Achieve More." },
      {
        name: "description",
        content: "AI-powered study tools, notes, quizzes, planning and productivity in one platform built for students.",
      },
      { property: "og:title", content: "Student Hub — Study Smarter. Achieve More." },
      {
        property: "og:description",
        content: "Notes, quizzes, flashcards, planning and focus sessions in one student platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const CATEGORIES = {
  STEM: [
    { icon: MessageSquare, title: "AI Study Assistant", body: "Work through equations and proofs step by step.", tone: "bg-brand" },
    { icon: ListChecks, title: "Quiz Generator", body: "Practice sets by topic and difficulty, with explanations.", tone: "bg-coral" },
    { icon: Layers, title: "Flashcards", body: "Formulas and definitions, rated easy to hard.", tone: "bg-navy" },
  ],
  Humanities: [
    { icon: BookOpen, title: "AI Notes", body: "Summarise readings into key points and questions.", tone: "bg-brand" },
    { icon: MessageSquare, title: "Essay thinking partner", body: "Explain arguments simply before you write.", tone: "bg-coral" },
    { icon: Layers, title: "Flashcards", body: "Dates, terms and thinkers, practised daily.", tone: "bg-navy" },
  ],
  Business: [
    { icon: CalendarDays, title: "Study Planner", body: "Tasks, deadlines and exams with a clear calendar.", tone: "bg-brand" },
    { icon: ListChecks, title: "Quiz Generator", body: "Case-study questions to test your understanding.", tone: "bg-coral" },
    { icon: Timer, title: "Pomodoro Timer", body: "Focused sessions logged into your study history.", tone: "bg-navy" },
  ],
} as const;

const MARQUEE_ITEMS = [
  "Built for every kind of learner",
  "STEM",
  "Humanities",
  "Business",
  "AI Tools",
  "Study Resources",
  "Smart Learning",
];

const STEPS = [
  { title: "Capture", body: "Save a note, task or exam the moment it appears." },
  { title: "Focus", body: "Pick the right next action and start a Pomodoro." },
  { title: "Reflect", body: "Watch your hours, scores and streak grow." },
];

const TESTIMONIALS = [
  { quote: "I finally know exactly what to do when I sit down to study.", name: "Maya R.", meta: "Psychology • 2 months ago", tone: "bg-brand-soft" },
  { quote: "The progress view keeps me honest without making me feel behind.", name: "Omar K.", meta: "Computer Science • 5 months ago", tone: "bg-card" },
  { quote: "Turning lecture notes into quiz questions made revision so much more active.", name: "Lena P.", meta: "Biomedical Science • 1 month ago", tone: "bg-brand-soft" },
];

const FAQ = [
  { q: "Is Student Hub free for students?", a: "Yes. The Free plan includes the core tools — notes, planner, Pomodoro and limited AI use — with no card required." },
  { q: "Can I use it for any course?", a: "Yes. Subjects, decks and tasks are all yours to name, so it works for any course or exam." },
  { q: "Does the AI Assistant write assignments for me?", a: "No. It explains ideas, breaks problems into steps and quizzes you — it's built to help you learn." },
  { q: "Can I cancel a paid plan anytime?", a: "Yes. You can cancel from the Subscription page at any time." },
];

function MarqueeChunk({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {[0, 1, 2, 3].map((rep) =>
        MARQUEE_ITEMS.map((item, i) => (
          <span key={`${rep}-${i}`} className="flex items-center">
            <span
              className={cn(
                "whitespace-nowrap text-sm",
                i === 0 ? "font-semibold text-sun" : "font-medium text-navy-foreground/85",
              )}
            >
              {item}
            </span>
            <span className="mx-7 size-1.5 shrink-0 rounded-full bg-coral/70" />
          </span>
        )),
      )}
    </div>
  );
}

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return <p className={cn("text-xs font-bold uppercase tracking-[0.12em] text-brand", className)}>{children}</p>;
}

function Home() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SitePage>
      {/* Hero */}
      <section className="grid-bg">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
              <span className="size-1.5 rounded-full bg-coral" />
              Everything You Need to Study Smarter
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.02] sm:text-7xl">
              Study Smarter.
              <br />
              <span className="text-brand">Achieve More.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Student Hub brings AI-powered study tools, notes, quizzes, planning and productivity into one simple
              platform.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 rounded-xl bg-brand px-6 text-brand-foreground shadow-lg shadow-brand/25 hover:bg-brand/90">
                <Link to="/signup">
                  Start for Free <ArrowRight className="ml-1 size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl bg-card px-6">
                <Link to="/features">
                  <Play className="mr-1 size-4" /> Explore Features
                </Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["No credit card", "Set up in 2 minutes", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-success" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Preview card */}
          <div className="rise relative">
            <div className="absolute -right-4 top-6 hidden h-40 w-24 rotate-6 rounded-3xl bg-coral/20 sm:block" />
            <div className="absolute -bottom-5 -left-4 hidden h-28 w-28 -rotate-6 rounded-3xl bg-sun/30 sm:block" />
            <div className="card-soft relative p-5 sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-brand">Example dashboard</p>
                  <p className="mt-1 font-display text-xl font-semibold">Good morning, Aisha</p>
                </div>
                <span className="grid size-10 place-items-center rounded-full bg-navy text-sm font-semibold text-navy-foreground">AK</span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  { icon: Check, v: "4", l: "Tasks today" },
                  { icon: Clock, v: "2h 20m", l: "Study time" },
                  { icon: Target, v: "72%", l: "Weekly goal" },
                ].map(({ icon: I, v, l }) => (
                  <div key={l} className="rounded-2xl border border-border p-3">
                    <I className="size-4 text-brand" />
                    <p className="mt-3 font-display text-lg font-semibold sm:text-xl">{v}</p>
                    <p className="text-xs text-muted-foreground">{l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-navy p-4 text-navy-foreground">
                <div className="flex items-center justify-between">
                  <p className="text-xs opacity-70">Next up</p>
                  <span className="rounded-full bg-sun px-2 py-0.5 font-mono text-xs font-semibold text-sun-foreground">10:30</span>
                </div>
                <p className="mt-1 font-display text-lg font-semibold">Calculus II</p>
                <p className="text-sm opacity-70">Integration · Chapter 6</p>
                <div className="mt-3 h-1.5 rounded-full bg-navy-foreground/15">
                  <div className="h-full w-3/5 rounded-full bg-coral" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-brand-soft p-4">
                  <CalendarDays className="size-4 text-brand" />
                  <p className="mt-3 text-sm font-semibold">3 exams this month</p>
                </div>
                <div className="rounded-2xl bg-coral/10 p-4">
                  <BarChart3 className="size-4 text-coral" />
                  <p className="mt-3 text-sm font-semibold">8 day study streak</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Learner marquee */}
      <div className="overflow-hidden bg-navy py-4 text-navy-foreground">
        <div className="marquee-track">
          <MarqueeChunk />
          <MarqueeChunk ariaHidden />
        </div>
      </div>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Eyebrow>Your semester, connected</Eyebrow>
        <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Less juggling. More learning.</h2>
        <p className="mt-3 text-lg text-muted-foreground">Every study tool on one desk — here's how it helps with STEM.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {CATEGORIES.STEM.map(({ icon: Icon, title, body, tone }, i) => (
            <div key={title} className="card-soft p-6 hover:-translate-y-1">
              <span className={cn("grid size-12 place-items-center rounded-full text-brand-foreground", tone)}>
                <Icon className="size-5" />
              </span>
              <p className="mt-6 font-mono text-xs font-semibold text-muted-foreground">0{i + 1}</p>
              <h3 className="mt-2 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-8 rounded-xl">
          <Link to="/features">
            See all features <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </section>

      {/* Dark focus section */}
      <section className="bg-navy text-navy-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <div>
            <Eyebrow className="text-sun">A calmer daily rhythm</Eyebrow>
            <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Know what matters next.</h2>
            <p className="mt-4 text-lg text-navy-foreground/70">
              Start each day with one clear view of your tasks, upcoming exams and focus sessions.
            </p>
            <div className="mt-8 divide-y divide-navy-foreground/10 border-t border-navy-foreground/10">
              {STEPS.map((s, i) => (
                <div key={s.title} className="flex gap-4 py-5">
                  <span className="font-mono text-sm font-semibold text-sun">0{i + 1}</span>
                  <div>
                    <p className="font-semibold">{s.title}</p>
                    <p className="mt-1 text-sm text-navy-foreground/65">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-navy-foreground/15 bg-navy-foreground/10 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-navy-foreground/60">Tuesday focus</p>
                <p className="font-display text-xl font-semibold">Deep work plan</p>
              </div>
              <span className="rounded-full bg-success/20 px-2.5 py-1 text-xs font-semibold text-success">On track</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                { t: "09:00", n: "Review organic chemistry", d: "45 min", c: "bg-brand" },
                { t: "11:30", n: "Research methods seminar", d: "60 min", c: "bg-coral" },
                { t: "15:00", n: "Draft literature review", d: "90 min", c: "bg-sun" },
              ].map((r) => (
                <div key={r.t} className="flex items-center gap-4 rounded-2xl bg-card px-4 py-4 text-card-foreground">
                  <span className="font-mono text-sm text-muted-foreground">{r.t}</span>
                  <span className={cn("h-9 w-1 rounded-full", r.c)} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.n}</p>
                    <p className="text-xs text-muted-foreground">{r.d}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <Eyebrow>Simple pricing</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Start free. Grow when you need.</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {PLANS.map((plan) => {
            const dark = plan.featured;
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative rounded-[1.25rem] border p-7",
                  dark ? "border-navy bg-navy text-navy-foreground shadow-2xl shadow-navy/30" : "card-soft",
                )}
              >
                {dark ? (
                  <span className="absolute right-5 top-5 rounded-full bg-sun px-2.5 py-1 text-xs font-bold text-sun-foreground">
                    Most popular
                  </span>
                ) : null}
                {plan.premium ? (
                  <span className="absolute right-5 top-5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-accent-foreground">
                    Premium
                  </span>
                ) : null}
                <p className="font-semibold">{plan.name}</p>
                <p className="mt-4 font-display text-4xl font-bold">
                  ${plan.price}
                  <span className={cn("ml-1 text-base font-normal", dark ? "text-navy-foreground/60" : "text-muted-foreground")}>/ month</span>
                </p>
                <p className={cn("mt-2 text-sm", dark ? "text-navy-foreground/70" : "text-muted-foreground")}>{plan.tagline}</p>
                <Button
                  asChild
                  className={cn(
                    "mt-6 w-full rounded-xl",
                    dark && "bg-sun text-sun-foreground hover:bg-sun/90",
                  )}
                  variant={dark ? "default" : "outline"}
                >
                  <Link to="/pricing">{plan.cta}</Link>
                </Button>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {plan.features.slice(0, 5).map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className={cn("mt-0.5 size-4 shrink-0", dark ? "text-sun" : "text-success")} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow className="text-coral">What students want</Eyebrow>
              <h2 className="mt-3 text-4xl font-bold">Real momentum, real results.</h2>
            </div>
            <p className="text-muted-foreground">Illustrative examples of how students use Student Hub.</p>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className={cn("flex h-full flex-col rounded-[1.25rem] border border-border p-6", t.tone)}>
                <Quote className="size-7 text-brand" />
                <blockquote className="mt-4 leading-relaxed">“{t.quote}”</blockquote>
                <figcaption className="mt-auto pt-6">
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.meta}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>Questions, answered</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold">Before you begin.</h2>
          <p className="mt-3 text-muted-foreground">Still wondering if Student Hub fits your study style?</p>
        </div>
        <div className="card-soft divide-y divide-border px-6">
          {FAQ.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left font-semibold"
                aria-expanded={open === i}
              >
                {f.q}
                <ChevronDown className={cn("size-4 shrink-0 transition-transform", open === i && "rotate-180")} />
              </button>
              {open === i ? <p className="-mt-2 pb-5 text-sm text-muted-foreground">{f.a}</p> : null}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-brand p-8 text-brand-foreground sm:p-12 md:flex-row md:items-center">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Your clearest semester starts here.</h2>
            <p className="mt-2 opacity-85">Set up your workspace in minutes. Keep it for every course ahead.</p>
          </div>
          <Button asChild size="lg" variant="secondary" className="rounded-xl bg-card text-foreground hover:bg-card/90">
            <Link to="/signup">
              Create your workspace <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </SitePage>
  );
}
