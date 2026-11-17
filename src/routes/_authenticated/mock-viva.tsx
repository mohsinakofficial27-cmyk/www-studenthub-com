import { createFileRoute } from "@tanstack/react-router";
import { Mic, MicOff, RotateCcw, Send, Volume2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { scoreVivaAnswer } from "@/lib/study-tools";

export const Route = createFileRoute("/_authenticated/mock-viva")({
  component: MockVivaPage,
});

type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechResult) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const QUESTION_BANK: Record<string, string[]> = {
  biology: ["Explain how natural selection can change a population over generations.", "How do photosynthesis and cellular respiration relate?", "What role does the cell membrane play in maintaining homeostasis?"],
  chemistry: ["How would you explain the difference between an atom and an ion?", "What evidence shows that a chemical reaction has occurred?", "How does concentration affect the rate of a reaction?"],
  physics: ["Explain Newton's second law using a real-world example.", "What is the difference between speed and velocity?", "How is energy conserved when an object falls?"],
  history: ["What were the major causes and effects of this historical event?", "How might two sources describe this event differently?", "Which piece of evidence best supports your interpretation?"],
  math: ["Explain the steps you would use to solve a quadratic equation.", "How can you check whether your solution is reasonable?", "What does the slope tell you about a linear relationship?"],
};

function MockVivaPage() {
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
  const [listening, setListening] = useState(false);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const dictationBase = useRef("");

  useEffect(() => () => recognition.current?.stop(), []);

  const askQuestion = () => {
    const key = subject.trim().toLowerCase();
    const bank = QUESTION_BANK[key] ?? [
      `What is the central idea of ${topic.trim() || subject.trim()}? Explain it in your own words.`,
      `Give one example that demonstrates ${topic.trim() || subject.trim()}, and explain why it fits.`,
      `What is a common misunderstanding about ${topic.trim() || subject.trim()}, and how would you correct it?`,
    ];
    setQuestion(bank[Math.floor(Math.random() * bank.length)] ?? bank[0] ?? "Explain one important idea from your subject.");
    setAnswer("");
    setResult(null);
  };

  const dictate = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Speech = (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
    if (!Speech) {
      toast.info("Speech-to-text is not supported in this browser. You can type your answer instead.");
      return;
    }
    const instance = new Speech();
    dictationBase.current = answer.trim();
    instance.lang = navigator.language || "en-US";
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      const transcripts = Array.from(event.results).map((part) => part[0]?.transcript ?? "").join(" ");
      setAnswer(`${dictationBase.current}${dictationBase.current && transcripts ? " " : ""}${transcripts}`.trim());
    };
    instance.onerror = () => {
      setListening(false);
      toast.info("Speech recognition stopped. You can continue by typing.");
    };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    try {
      instance.start();
      setListening(true);
    } catch {
      toast.error("Could not start microphone dictation. Check browser microphone permission.");
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answer.trim()) return;
    recognition.current?.stop();
    setListening(false);
    setResult(scoreVivaAnswer(answer));
  };

  return (
    <AppShell title="Mock Viva Simulator" description="Practise oral answers with local subject prompts and transparent feedback.">
      <InfoNote title="Practice simulator—not an AI examiner" description="Questions come from a small local prompt bank. Scores are simple length-and-structure heuristics, not an assessment of subject accuracy. Speech recognition, when available, is provided by your browser and may use its own service." />
      <section className="panel mx-auto max-w-3xl space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Subject (e.g. Biology)" aria-label="Subject" />
          <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Topic or chapter (optional)" aria-label="Topic" />
        </div>
        <Button onClick={askQuestion} disabled={!subject.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90"><RotateCcw className="size-4" /> Ask me a question</Button>
        {question ? (
          <form onSubmit={submit} className="space-y-4 border-t border-border pt-4">
            <div className="rounded-xl bg-brand-soft/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Examiner asks</p>
              <p className="mt-2 text-lg font-medium">{question}</p>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => {
                if (!("speechSynthesis" in window)) {
                  toast.info("Spoken playback is not supported in this browser.");
                  return;
                }
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(new SpeechSynthesisUtterance(question));
              }}><Volume2 className="size-4" /> Read question aloud</Button>
            </div>
            <label htmlFor="viva-answer" className="text-sm font-medium">Your answer</label>
            <textarea id="viva-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Answer in your own words…" />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={dictate}>{listening ? <><MicOff className="size-4" /> Stop dictation</> : <><Mic className="size-4" /> Dictate answer</>}</Button>
              <Button type="submit" disabled={!answer.trim()} className="bg-brand text-brand-foreground hover:bg-brand/90"><Send className="size-4" /> Get practice feedback</Button>
            </div>
          </form>
        ) : null}
        {result ? (
          <div className="rounded-xl border border-border p-4" aria-live="polite">
            <p className="text-lg font-semibold">Practice structure score: {result.score}/10</p>
            <p className="mt-2 text-sm text-muted-foreground">{result.feedback}</p>
          </div>
        ) : null}
      </section>
    </AppShell>
  );
}
