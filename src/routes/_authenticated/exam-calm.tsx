import { createFileRoute } from "@tanstack/react-router";
import { Heart, Pause, Play, RotateCcw, Wind } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/exam-calm")({
  component: ExamCalmPage,
});

const QUOTES = [
  "You do not have to know everything to take the next step.",
  "Progress comes from showing up, one question at a time.",
  "A difficult moment is not a measure of your ability.",
  "Breathe, reset, and focus on what you can do next.",
];

const QUESTIONS = [
  { prompt: "You meet a question you cannot answer immediately. What is a useful first step?", choices: ["Panic and stop", "Take a breath, identify what it asks, and try one known fact", "Skip the entire exam"], answer: 1 },
  { prompt: "How can you make a large revision topic feel more manageable?", choices: ["Choose one small subtopic and a short timer", "Wait until you feel perfectly ready", "Try to memorize everything at once"], answer: 0 },
  { prompt: "What does one hard practice question tell you?", choices: ["That you can never learn the topic", "Only that this question needs another look", "That you should abandon the subject"], answer: 1 },
];

function ExamCalmPage() {
  const [seconds, setSeconds] = useState(120);
  const [running, setRunning] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([-1, -1, -1]);
  const phaseSecond = (120 - seconds) % 14;
  const phase = phaseSecond < 4 ? "Breathe in" : phaseSecond < 6 ? "Hold gently" : "Breathe out";

  useEffect(() => {
    if (!running || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [running, seconds]);

  const score = answers.reduce((total, answer, index) => total + (answer === QUESTIONS[index]?.answer ? 1 : 0), 0);
  const complete = answers.every((answer) => answer >= 0);

  return (
    <AppShell title="Exam Anxiety & Stress Buster" description="Take a gentle two-minute breathing reset and a short confidence check.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel flex flex-col items-center p-6 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand"><Wind className="size-6" /></span>
          <h2 className="mt-3 text-xl font-semibold">Two-minute breathing break</h2>
          <p className="mt-2 text-sm text-muted-foreground">Follow the gentle 4–2–8 rhythm, or pause whenever you like.</p>
          <div className="mt-6 grid size-48 place-items-center rounded-full border-4 border-brand/30 bg-brand-soft/40">
            <div>
              <p className="text-2xl font-semibold">{running ? phase : seconds === 0 ? "Complete" : "Ready"}</p>
              <p className="mt-1 font-mono text-lg tabular-nums">{String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p>
            </div>
          </div>
          <div className="mt-5 flex gap-2">
            <Button onClick={() => { if (seconds === 0) setSeconds(120); setRunning((value) => !value); }} className="bg-brand text-brand-foreground hover:bg-brand/90">
              {running ? <Pause className="size-4" /> : <Play className="size-4" />}{running ? "Pause" : seconds === 0 ? "Breathe again" : "Begin"}
            </Button>
            <Button variant="outline" onClick={() => { setRunning(false); setSeconds(120); }}><RotateCcw className="size-4" /> Reset</Button>
          </div>
        </section>
        <section className="panel flex flex-col justify-center p-6">
          <Heart className="size-6 text-brand" />
          <p className="mt-4 text-xl font-medium leading-relaxed">“{QUOTES[quoteIndex]}”</p>
          <Button variant="outline" className="mt-5 w-fit" onClick={() => setQuoteIndex((value) => (value + 1) % QUOTES.length)}>Another reminder</Button>
          <p className="mt-6 text-xs text-muted-foreground">If exam stress feels overwhelming, consider talking with someone you trust or a qualified support professional.</p>
        </section>
      </div>
      <section className="panel mt-4 p-5">
        <h2 className="text-lg font-semibold">Quick confidence check</h2>
        <p className="mt-1 text-sm text-muted-foreground">There is no grade here—just practical ways to begin.</p>
        <ol className="mt-4 space-y-5">
          {QUESTIONS.map((question, index) => (
            <li key={question.prompt}>
              <p className="text-sm font-medium">{index + 1}. {question.prompt}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {question.choices.map((choice, choiceIndex) => (
                  <button key={choice} type="button" onClick={() => setAnswers((values) => values.map((value, i) => i === index ? choiceIndex : value))} className={`rounded-xl border p-3 text-left text-sm ${answers[index] === choiceIndex ? "border-brand bg-brand-soft" : "border-border hover:border-brand/50"}`}>{choice}</button>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {complete ? <p className="mt-4 rounded-xl bg-brand-soft/50 p-3 text-sm">You chose {score}/3 practical strategies. Take one small step at a time—you can reset and retry whenever you like.</p> : null}
      </section>
    </AppShell>
  );
}
