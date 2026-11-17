import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageSquare, Mic, MicOff, Save, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { createNote } from "@/lib/data";
import { askAssistantAI } from "@/lib/ai.functions";
import { askAssistant, isAiSetupIssue } from "@/lib/ai";

export const Route = createFileRoute("/_authenticated/voice-tutor")({
  head: () => ({
    meta: [
      { title: "AI Voice Tutor — Student Hub" },
      { name: "description", content: "Practice spoken study conversations with an AI tutor." },
    ],
  }),
  component: VoiceTutorPage,
});

type TutorMessage = { role: "user" | "assistant"; content: string };

interface RecognitionResultLike {
  0?: { transcript?: string };
  isFinal: boolean;
}

interface RecognitionEventLike extends Event {
  results: ArrayLike<RecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function VoiceTutorPage() {
  const { user } = useAuth();
  const ask = useServerFn(askAssistantAI);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [subject, setSubject] = useState("");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const speechWindow =
    typeof window === "undefined"
      ? null
      : (window as Window & {
          SpeechRecognition?: SpeechRecognitionConstructor;
          webkitSpeechRecognition?: SpeechRecognitionConstructor;
        });
  const Recognition = speechWindow?.SpeechRecognition ?? speechWindow?.webkitSpeechRecognition;
  const speechAvailable = Boolean(Recognition);
  const speechSynthesisAvailable = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    },
    [],
  );

  const startListening = () => {
    if (!Recognition || busy) return;
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (transcript) setInput(transcript);
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("Speech recognition stopped. You can continue by typing.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      setListening(false);
      toast.error(
        "The microphone could not start. Check browser permissions or type your question.",
      );
    }
  };

  const speak = (content: string) => {
    if (!speechSynthesisAvailable) {
      toast.error("Text-to-speech is not supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      toast.error("The response could not be played aloud.");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const send = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const question = input.trim();
    if (!user || !question || busy) return;
    const userMessage = subject.trim()
      ? `Tutor me about ${subject.trim()}. Explain clearly and ask a quick check-for-understanding question.\n\n${question}`
      : question;
    const updatedMessages = [...messages, { role: "user" as const, content: question }];
    setMessages(updatedMessages);
    setInput("");
    setBusy(true);
    try {
      const result = await ask({
        data: {
          mode: "explain",
          messages: [
            ...messages.map((message) => ({
              role: message.role,
              content: message.content.slice(0, 8000),
            })),
            { role: "user", content: userMessage.slice(0, 8000) },
          ].slice(-40),
        },
      });
      if (!result.ok) {
        if (("setupRequired" in result && result.setupRequired) || isAiSetupIssue(result.error)) {
          toast.info(`${result.error} Using local study prompts.`);
          const fallback = await askAssistant(question, "explain");
          const nextMessages = [
            ...updatedMessages,
            { role: "assistant" as const, content: fallback.content },
          ];
          setMessages(nextMessages);
          speak(fallback.content);
        } else toast.error(result.error);
        return;
      }
      const nextMessages = [
        ...updatedMessages,
        { role: "assistant" as const, content: result.content },
      ];
      setMessages(nextMessages);
      speak(result.content);
    } catch {
      toast.error("The tutor is unavailable right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveTranscript = () => {
    if (!user || !messages.length) return;
    createNote(user.id, {
      title: subject.trim() ? `Voice tutor · ${subject.trim()}` : "Voice tutor conversation",
      subject: subject.trim() || "Study",
      content: messages
        .map((message) => `${message.role === "user" ? "You" : "Tutor"}: ${message.content}`)
        .join("\n\n"),
    });
    toast.success("Conversation saved to your notes.");
  };

  return (
    <AppShell
      title="AI Voice Tutor"
      description="Talk or type through a topic with an encouraging, subject-aware tutor."
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <section className="panel ai-glow-border space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="tutor-subject">Subject or topic (optional)</Label>
            <Input
              id="tutor-subject"
              value={subject}
              maxLength={120}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="e.g. introductory calculus"
            />
          </div>
          <div
            className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground"
            aria-live="polite"
          >
            <span>
              {listening
                ? "Listening… speak now."
                : speechAvailable
                  ? "Voice input is available in this browser."
                  : "Speech recognition is not available here; you can type instead."}
            </span>
            {messages.length ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={saveTranscript}
              >
                <Save className="size-4" /> Save transcript
              </Button>
            ) : null}
          </div>

          <div className="min-h-72 space-y-3 rounded-xl bg-surface p-4" aria-live="polite">
            {messages.length ? (
              messages.map((message, index) => (
                <div
                  key={`${index}-${message.role}`}
                  className={`max-w-[90%] rounded-xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "ml-auto bg-brand text-brand-foreground" : "bg-card"}`}
                >
                  <p className="mb-1 text-xs font-semibold opacity-75">
                    {message.role === "user" ? "You" : "Tutor"}
                  </p>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" && speechSynthesisAvailable ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-1 h-8 gap-1 px-2"
                      aria-label={speaking ? "Stop speaking" : "Read tutor response aloud"}
                      onClick={() => {
                        if (speaking) {
                          window.speechSynthesis.cancel();
                          setSpeaking(false);
                        } else {
                          speak(message.content);
                        }
                      }}
                    >
                      {speaking ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                      {speaking ? "Stop" : "Listen"}
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <MessageSquare className="size-8 text-muted-foreground" />
                <p className="mt-3 font-medium">Start a tutoring conversation</p>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Ask a question, describe a problem, or use the microphone. The tutor explains
                  ideas and checks your understanding.
                </p>
              </div>
            )}
          </div>

          <form onSubmit={send} className="space-y-3">
            <Label htmlFor="voice-question" className="sr-only">
              Your question
            </Label>
            <Textarea
              id="voice-question"
              rows={3}
              maxLength={2000}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask your tutor a question…"
              disabled={busy}
              className="ai-glow-border"
            />
            <div className="flex flex-wrap justify-end gap-2">
              {speechAvailable ? (
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  disabled={busy}
                  onClick={() => {
                    if (listening) {
                      recognitionRef.current?.stop();
                      setListening(false);
                    } else {
                      startListening();
                    }
                  }}
                >
                  {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                  {listening ? "Stop listening" : "Speak"}
                </Button>
              ) : null}
              <Button
                type="submit"
                className="gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
                disabled={busy || !input.trim()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <MessageSquare className="size-4" />
                )}{" "}
                Ask tutor
              </Button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
