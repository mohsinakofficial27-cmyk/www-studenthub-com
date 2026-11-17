import { Link } from "@tanstack/react-router";
import { ArrowRight, MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

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
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand">
            See it in action
          </p>
          <h2 className="mt-3 text-4xl font-bold sm:text-5xl">
            Stuck on a problem? Go step by step.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            The AI Study Assistant breaks problems into clear steps so you understand the method,
            not just the answer.
          </p>
          <Button asChild variant="outline" className="mt-6 rounded-xl">
            <Link to="/signup">
              Try the assistant <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
        <div
          className="card-soft ai-glow-border p-5 sm:p-6"
          aria-label="Animated example of the AI Study Assistant"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <MessageSquare className="size-4 text-brand" /> AI Study Assistant
            </p>
            <span className="rounded-full bg-brand px-3 py-1 text-xs text-brand-foreground">
              Step-by-Step
            </span>
          </div>
          <div className="mt-5 flex justify-end">
            <p className="max-w-[85%] rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
              {DEMO_Q}
            </p>
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
