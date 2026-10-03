import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const FREE_FEATURES = [
  "AI Study Assistant (15 questions per day)",
  "AI Notes with summaries and key points",
  "Quiz Generator with explanations",
  "Flashcard decks and study mode",
  "Study Planner with tasks and exams",
  "Pomodoro timer and focus history",
  "Progress tracking and study streaks",
];

export function FreePlanCard() {
  return (
    <div className="mx-auto mt-12 max-w-xl">
      <div className="relative rounded-[1.25rem] border border-navy bg-navy p-7 text-navy-foreground shadow-2xl shadow-navy/30 sm:p-9">
        <span className="absolute right-5 top-5 rounded-full bg-sun px-2.5 py-1 text-xs font-bold text-sun-foreground">
          Launch offer
        </span>
        <p className="font-semibold">Free during launch</p>
        <p className="mt-4 font-display text-4xl font-bold">
          $0
          <span className="ml-1 text-base font-normal text-navy-foreground/60">/ month</span>
        </p>
        <p className="mt-2 text-sm text-navy-foreground/70">100% free while we launch. Everything included.</p>
        <Button asChild className="mt-6 w-full rounded-xl bg-sun text-sun-foreground hover:bg-sun/90">
          <Link to="/signup">Start for Free</Link>
        </Button>
        <ul className="mt-6 space-y-2.5 text-sm">
          {FREE_FEATURES.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-sun" /> {f}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">Premium features may come later. Tell us what you would want.</p>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/feedback">
            Share your feedback <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

const DEMO_Q = "Step-by-step: solve 2x + 5 = 17";
const DEMO_STEPS = [
  "1. Start with the equation: 2x + 5 = 17",
  "2. Subtract 5 from both sides: 2x = 12",
  "3. Divide both sides by 2: x = 6",
  "4. Check: 2(6) + 5 = 17 ✓  So x = 6.",
];

export function AssistantDemo() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setShown((s) => (s >= DEMO_STEPS.length + 2 ? 0 : s + 1)), 1100);
    return () => clearInterval(t);
  }, []);
  const visible = Math.min(shown, DEMO_STEPS.length);

  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">See it in action</p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">Stuck on a problem? Go step by step.</h2>
          <p className="mt-3 text-lg text-muted-foreground">
            The AI Study Assistant breaks problems into clear steps so you understand the method, not just the answer.
          </p>
          <Button asChild variant="outline" className="mt-6 rounded-xl">
            <Link to="/signup">
              Try the assistant <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
        <div className="card-soft p-5 sm:p-6" aria-label="Animated example of the AI Study Assistant">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4 text-brand" /> AI Study Assistant
            </p>
            <span className="rounded-full bg-brand px-3 py-1 text-xs text-brand-foreground">Step-by-Step</span>
          </div>
          <div className="mt-5 flex justify-end">
            <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">{DEMO_Q}</p>
          </div>
          <div className="mt-4 min-h-[9.5rem] space-y-2 text-sm">
            {visible === 0 ? (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Sparkles className="size-4 animate-pulse text-brand" /> Thinking…
              </p>
            ) : (
              DEMO_STEPS.slice(0, visible).map((s) => (
                <p key={s} className="rise">
                  {s}
                </p>
              ))
            )}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Example animation</p>
        </div>
      </div>
    </section>
  );
}
