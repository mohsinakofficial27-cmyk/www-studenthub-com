import { Link, createFileRoute } from "@tanstack/react-router";
import {
  AlarmClock,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarDays,
  Check,
  ChevronDown,
  Flame,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Lock,
  Minus,
  Sparkles,
  Star,
  Target,
  Timer,
} from "lucide-react";
import { useState } from "react";

import { SitePage } from "@/components/site-layout";
import { AssistantDemo } from "@/components/launch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Student Hub — Your Student Life, Organized by AI" },
      {
        name: "description",
        content:
          "Plan your semester, manage deadlines, study smarter, and turn notes into quizzes and flashcards. Free AI student workspace for high school and college.",
      },
      { property: "og:title", content: "Student Hub — Your Student Life, Organized by AI" },
      {
        property: "og:description",
        content: "Semester planning, deadlines, GPA, AI study tools and focus sessions in one student workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const MARQUEE_ITEMS = [
  "Built for high school and college",
  "Semester planning",
  "Deadlines",
  "GPA tools",
  "AI study tools",
  "Flashcards",
  "Focus sessions",
];

const BENEFITS = [
  { icon: BrainCircuit, title: "AI Study Coach", body: "Know what to study next.", tone: "bg-brand" },
  { icon: CalendarDays, title: "Smart Planning", body: "Turn deadlines into a realistic plan.", tone: "bg-coral" },
  { icon: Layers, title: "AI Study Tools", body: "Turn notes into flashcards and practice tests.", tone: "bg-navy" },
  { icon: GraduationCap, title: "GPA Tools", body: "Understand where your grades are heading.", tone: "bg-brand" },
  { icon: Timer, title: "Focus Mode", body: "Protect your study time.", tone: "bg-coral" },
  { icon: BarChart3, title: "Analytics", body: "See how consistently you're actually studying.", tone: "bg-navy" },
];

const HOW = [
  { title: "Tell Student Hub About Your Semester", body: "Add your classes, exams, deadlines and how many hours you can realistically study." },
  { title: "Let AI Build Your Plan", body: "Get today's priorities and study sessions shaped around what's due first." },
  { title: "Study, Track, Improve", body: "Use quizzes, flashcards and focus sessions, then watch your consistency grow." },
];

const PROOF = [
  { icon: LayoutDashboard, title: "One dashboard", body: "Tasks, exams, notes and progress in a single view." },
  { icon: Sparkles, title: "AI planning", body: "Priorities and sessions built from your real deadlines." },
  { icon: Layers, title: "Study tools", body: "Notes, quizzes, flashcards and an AI assistant." },
  { icon: AlarmClock, title: "Deadline tracking", body: "Exams and assignments with clear countdowns." },
  { icon: GraduationCap, title: "GPA tools", body: "Keep an eye on where your grades are heading." },
];

const COMPARE: { f: string; free: string | boolean; pro: string | boolean }[] = [
  { f: "Study planner & calendar", free: "Basic", pro: "Smart study plans" },
  { f: "AI Student Coach", free: "15 questions / day", pro: "Expanded limits" },
  { f: "Notes, quizzes & flashcards", free: "Limited", pro: "AI Notes → Flashcards" },
  { f: "Pomodoro / Study Mode", free: "Basic", pro: "Advanced Study Mode" },
  { f: "GPA calculator", free: true, pro: "Advanced GPA tools" },
  { f: "Courses", free: "Limited", pro: "More courses" },
  { f: "AI Syllabus Scanner", free: false, pro: true },
  { f: "AI Practice Tests", free: false, pro: true },
  { f: "Deadline Protection", free: false, pro: true },
  { f: "Advanced Analytics", free: false, pro: true },
];

const FAQ = [
  { q: "What is Student Hub?", a: "Student Hub is an AI-powered student workspace. It brings your study planner, deadlines, notes, quizzes, flashcards, focus timer and an AI study assistant into one place." },
  { q: "Is Student Hub free?", a: "Yes. You can create an account and use the core tools for free — no credit card required. A paid Student Pro plan with extra features is coming soon." },
  { q: "Does Student Hub work for college students?", a: "Yes. It's built for high school, college and graduate students. You add your own courses, exams and deadlines, so it fits any schedule or major." },
  { q: "Can I upload my syllabus?", a: "Not yet. The AI Syllabus Scanner is planned for Student Pro. For now you can add exams and deadlines in the Study Planner in a few clicks." },
  { q: "Can Student Hub create quizzes from my notes?", a: "Yes. Paste or write your notes and Student Hub can generate a summary, key points, flashcards and quiz questions from them." },
  { q: "How does the GPA calculator work?", a: "You enter each course's grade and credit hours, and Student Hub calculates a weighted average on the standard 4.0 scale. Advanced GPA tools are planned for Student Pro." },
  { q: "Can I cancel Pro?", a: "Student Pro isn't available to buy yet. When it launches, you'll be able to cancel any time from your account and keep using the Free plan." },
  { q: "Is my academic information private?", a: "Your notes, tasks and study data are tied to your account and only visible to you. We don't sell your data. See our Privacy Policy for details." },
];

const TRUST = [
  { t: "What we store", b: "Your account email, profile details, and the notes, tasks, quizzes and study sessions you create." },
  { t: "How it's used", b: "Only to run your workspace — showing your dashboard, plans and progress. We don't sell your data." },
  { t: "Who can see it", b: "Only you. Each account's study data is private to that account." },
  { t: "AI questions", b: "Messages you send to the AI assistant are processed to generate a reply. Avoid sharing sensitive personal info." },
];

function MarqueeChunk({ ariaHidden = false }: { ariaHidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden || undefined}>
      {[0, 1, 2, 3].map((rep) =>
        MARQUEE_ITEMS.map((item, i) => (
          <span key={`${rep}-${i}`} className="flex items-center">
            <span className={cn("whitespace-nowrap text-sm", i === 0 ? "font-semibold text-sun" : "font-medium text-navy-foreground/85")}>
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

function PrimaryCta({ className }: { className?: string }) {
  return (
    <Button asChild size="lg" className={cn("h-12 rounded-xl bg-brand px-6 text-brand-foreground shadow-lg shadow-brand/25 hover:bg-brand/90", className)}>
      <Link to="/signup">
        Build My Semester — Free <ArrowRight className="ml-1 size-4" />
      </Link>
    </Button>
  );
}

const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

function DashboardPreview() {
  const [tasks, setTasks] = useState([
    { n: "Calculus II — problem set 6", d: true },
    { n: "Read Bio ch. 9 (cell signaling)", d: false },
    { n: "Outline history essay", d: false },
  ]);
  const done = tasks.filter((t) => t.d).length;
  return (
    <div className="card-soft relative p-4 sm:p-5" aria-label="Example Student Hub dashboard">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand">Example dashboard</p>
          <p className="mt-0.5 font-display text-lg font-semibold">Good morning, Jordan</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-coral/10 px-2.5 py-1 text-xs font-semibold text-coral">
          <Flame className="size-3.5" /> 6-day streak
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">GPA</p>
          <p className="font-display text-xl font-semibold">3.62</p>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-[11px] text-muted-foreground">Progress</p>
          <p className="font-display text-xl font-semibold">{Math.round((done / tasks.length) * 100)}%</p>
          <div className="mt-1.5 h-1 rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
          </div>
        </div>
        <div className="rounded-xl bg-navy p-3 text-navy-foreground">
          <p className="text-[11px] opacity-70">Exam</p>
          <p className="font-display text-sm font-semibold leading-tight">Chem midterm</p>
          <p className="font-mono text-xs text-sun">in 5 days</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold">Today's tasks</p>
          <ul className="mt-2 space-y-1.5">
            {tasks.map((t, i) => (
              <li key={t.n}>
                <button
                  type="button"
                  onClick={() => setTasks((cur) => cur.map((x, j) => (j === i ? { ...x, d: !x.d } : x)))}
                  className="flex w-full items-center gap-2 text-left text-xs"
                >
                  <span className={cn("grid size-4 shrink-0 place-items-center rounded border", t.d ? "border-brand bg-brand text-brand-foreground" : "border-border")}>
                    {t.d ? <Check className="size-3" /> : null}
                  </span>
                  <span className={cn("truncate", t.d && "text-muted-foreground line-through")}>{t.n}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border p-3">
          <p className="text-xs font-semibold">October</p>
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px]">
            {WEEK.map((d, i) => (
              <span key={i} className="text-muted-foreground">{d}</span>
            ))}
            {Array.from({ length: 14 }, (_, i) => i + 6).map((d) => (
              <span
                key={d}
                className={cn(
                  "rounded py-0.5",
                  d === 7 && "bg-brand font-semibold text-brand-foreground",
                  d === 12 && "bg-coral/15 font-semibold text-coral",
                  d === 16 && "bg-sun/30 font-semibold",
                )}
              >
                {d}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex gap-2.5 rounded-xl bg-brand-soft p-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" />
        <div>
          <p className="text-xs font-semibold">AI recommendation</p>
          <p className="text-xs text-muted-foreground">Spend 40 min on stoichiometry today — your Chem midterm is the closest deadline.</p>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">Sample data · try ticking a task</p>
    </div>
  );
}

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto size-4 text-success" aria-label="Included" />;
  if (v === false) return <Minus className="mx-auto size-4 text-muted-foreground/50" aria-label="Not included" />;
  return <span>{v}</span>;
}

function Pricing() {
  const [yearly, setYearly] = useState(true);
  return (
    <section id="pricing" className="scroll-mt-20 bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="text-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Everything You Need to Stay Ahead.</h2>
          <p className="mt-3 text-muted-foreground">Start free. Student Pro is coming soon.</p>
          <div className="mt-6 inline-flex rounded-xl border border-border bg-card p-1 text-sm" role="group" aria-label="Billing period">
            {[
              { k: false, l: "Monthly" },
              { k: true, l: "Yearly" },
            ].map(({ k, l }) => (
              <button
                key={l}
                type="button"
                onClick={() => setYearly(k)}
                aria-pressed={yearly === k}
                className={cn("rounded-lg px-4 py-1.5 font-semibold transition-colors", yearly === k ? "bg-navy text-navy-foreground" : "text-muted-foreground")}
              >
                {l}
                {k ? <span className="ml-1.5 rounded-full bg-sun px-1.5 py-0.5 text-[10px] text-sun-foreground">Best Value</span> : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="card-soft flex flex-col p-7">
            <p className="font-semibold">Free</p>
            <p className="mt-3 font-display text-4xl font-bold">
              $0<span className="ml-1 text-base font-normal text-muted-foreground">/ forever</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">The core tools to get organized.</p>
            <Button asChild variant="outline" className="mt-auto w-full rounded-xl pt-0">
              <Link to="/signup">Start Free</Link>
            </Button>
          </div>
          <div className="relative flex flex-col rounded-[1.25rem] bg-navy p-7 text-navy-foreground shadow-2xl shadow-navy/30">
            <span className="absolute right-5 top-5 rounded-full bg-sun px-2.5 py-1 text-xs font-bold text-sun-foreground">Coming soon</span>
            <p className="font-semibold">Student Pro</p>
            <p className="mt-3 font-display text-4xl font-bold">
              {yearly ? "$49.99" : "$7.99"}
              <span className="ml-1 text-base font-normal text-navy-foreground/60">{yearly ? "/ year" : "/ month"}</span>
            </p>
            <p className="mt-2 text-sm text-navy-foreground/70">
              {yearly ? "About $4.17/month, billed yearly." : "Billed monthly. Cancel anytime once live."}
            </p>
            <Button disabled className="mt-6 w-full rounded-xl bg-sun text-sun-foreground">
              Upgrade to Student Pro — Coming soon
            </Button>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 text-left">
              <tr>
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="w-[28%] px-2 py-3 text-center font-semibold">Free</th>
                <th className="w-[32%] px-2 py-3 text-center font-semibold text-brand">Student Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {COMPARE.map((r) => (
                <tr key={r.f}>
                  <td className="px-4 py-3">{r.f}</td>
                  <td className="px-2 py-3 text-center text-xs text-muted-foreground sm:text-sm"><Cell v={r.free} /></td>
                  <td className="px-2 py-3 text-center text-xs font-medium sm:text-sm"><Cell v={r.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">Pro features are in development. Prices shown are planned launch prices.</p>
      </div>
    </section>
  );
}

function RatingSection() {
  const { user } = useAuth();
  const [hover, setHover] = useState(0);
  const [value, setValue] = useState(0);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");

  const submit = async (n: number) => {
    setValue(n);
    if (!user) return;
    setState("saving");
    const { error } = await supabase.from("site_ratings").insert({ rating: n, user_id: user.id });
    setState(error ? "error" : "done");
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="card-soft flex flex-col items-center px-6 py-10 text-center">
        <Eyebrow>Student Hub</Eyebrow>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">How would you rate Student Hub?</h2>
        <div className="mt-5 flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              disabled={state === "saving" || state === "done"}
              onMouseEnter={() => setHover(n)}
              onClick={() => void submit(n)}
              className="p-1 transition-transform hover:scale-110 disabled:hover:scale-100"
            >
              <Star className={cn("size-9", (hover || value) >= n ? "fill-sun text-sun" : "text-muted-foreground/40")} />
            </button>
          ))}
        </div>
        <p className="mt-3 min-h-5 text-sm">
          {state === "done" ? (
            <span className="font-semibold text-success">Thanks for your feedback!</span>
          ) : state === "error" ? (
            <span className="text-destructive">Couldn't save your rating — please try again.</span>
          ) : !user && value ? (
            <span className="text-muted-foreground">
              <Link to="/login" className="font-semibold text-brand underline">Log in</Link> to submit your rating.
            </span>
          ) : (
            <span className="text-muted-foreground">Ratings are from real, logged-in students.</span>
          )}
        </p>
      </div>
    </section>
  );
}

function Home() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SitePage>
      {/* Hero */}
      <section className="grid-bg">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:py-20">
          <div className="rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-soft px-3 py-1 text-xs font-semibold text-accent-foreground">
              <span className="size-1.5 rounded-full bg-coral" />
              For high school & college students
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.02] sm:text-6xl">
              Your Entire Student Life. <span className="text-brand">Organized by AI.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Plan your semester, manage deadlines, study smarter, and turn your notes into personalized quizzes and
              flashcards — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <PrimaryCta />
              <Button asChild size="lg" variant="outline" className="h-12 rounded-xl bg-card px-6">
                <a href="#how-it-works">See How It Works</a>
              </Button>
            </div>
            <p className="mt-5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Check className="size-4 text-success" /> No credit card required
            </p>
          </div>
          <div className="rise relative">
            <div className="absolute -right-4 top-6 hidden h-40 w-24 rotate-6 rounded-3xl bg-coral/20 sm:block" />
            <div className="absolute -bottom-5 -left-4 hidden h-28 w-28 -rotate-6 rounded-3xl bg-sun/30 sm:block" />
            <DashboardPreview />
          </div>
        </div>
      </section>

      <div className="overflow-hidden bg-navy py-4 text-navy-foreground">
        <div className="marquee-track">
          <MarqueeChunk />
          <MarqueeChunk ariaHidden />
        </div>
      </div>

      {/* Benefits */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <Eyebrow>Features</Eyebrow>
        <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Built Around Your Student Life</h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body, tone }) => (
            <div key={title} className="card-soft p-6 hover:-translate-y-1">
              <span className={cn("grid size-12 place-items-center rounded-full text-brand-foreground", tone)}>
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <Eyebrow className="text-sun">How it works</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">From chaos to a plan in three steps.</h2>
          <ol className="mt-12 grid gap-5 md:grid-cols-3">
            {HOW.map((s, i) => (
              <li key={s.title} className="group relative rounded-3xl border border-navy-foreground/15 bg-navy-foreground/5 p-6 transition-colors hover:bg-navy-foreground/10">
                <span className="font-mono text-3xl font-bold text-sun">0{i + 1}</span>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-navy-foreground/70">{s.body}</p>
                {i < HOW.length - 1 ? (
                  <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-full bg-coral p-1 text-navy-foreground md:block" />
                ) : null}
              </li>
            ))}
          </ol>
          <PrimaryCta className="mt-10" />
        </div>
      </section>

      <div className="pt-20">
        <AssistantDemo />
      </div>

      {/* Feature-based proof */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="text-center">
          <Eyebrow>Why Student Hub</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Designed for the Way Students Actually Study</h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PROOF.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="size-5 text-brand" />
              <p className="mt-3 font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <Pricing />

      {/* FAQ */}
      <section id="faq" className="mx-auto grid max-w-6xl scroll-mt-20 gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-3 text-4xl font-bold">Questions, answered.</h2>
          <p className="mt-3 text-muted-foreground">
            Something else? <Link to="/contact" className="font-semibold text-brand underline">Contact us</Link>.
          </p>
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

      {/* Trust */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl border border-border bg-surface p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-full bg-navy text-navy-foreground"><Lock className="size-5" /></span>
            <h2 className="text-3xl font-bold">Your Data Matters</h2>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST.map((x) => (
              <div key={x.t}>
                <p className="font-semibold">{x.t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{x.b}</p>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold text-brand">
            <Link to="/privacy" className="underline">Privacy Policy</Link>
            <Link to="/terms" className="underline">Terms</Link>
            <Link to="/contact" className="underline">Contact</Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center rounded-3xl bg-brand p-8 text-center text-brand-foreground sm:p-14">
          <Target className="size-8 opacity-80" />
          <h2 className="mt-4 text-3xl font-bold sm:text-5xl">Make This Semester Your Most Organized Yet.</h2>
          <p className="mt-3 opacity-85">Build your personalized Student Hub in minutes.</p>
          <Button asChild size="lg" className="mt-7 h-12 rounded-xl bg-card px-6 text-foreground hover:bg-card/90">
            <Link to="/signup">
              Build My Semester — Free <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <p className="mt-3 text-sm opacity-85">No credit card required</p>
        </div>
      </section>

      <RatingSection />
    </SitePage>
  );
}
