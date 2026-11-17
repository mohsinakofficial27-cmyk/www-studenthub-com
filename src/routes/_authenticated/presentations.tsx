import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, Loader2, Plus, Presentation, Save, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { createNote } from "@/lib/data";
import { generatePresentationAI } from "@/lib/ai.functions";
import { isAiSetupIssue } from "@/lib/ai";

export const Route = createFileRoute("/_authenticated/presentations")({
  head: () => ({
    meta: [
      { title: "Presentation Maker — Student Hub" },
      {
        name: "description",
        content: "Generate editable presentation outlines and export your slides.",
      },
    ],
  }),
  component: PresentationsPage,
});

interface Slide {
  title: string;
  content: string;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function buildPresentationHtml(title: string, slides: Slide[]) {
  const slideMarkup = slides
    .map((slide, index) => {
      const bullets = slide.content
        .split(/\n+/)
        .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
        .filter(Boolean)
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("");
      return `<section class="slide"><small>${index + 1} / ${slides.length}</small><h2>${escapeHtml(slide.title)}</h2><ul>${bullets}</ul></section>`;
    })
    .join("\n");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title>
<style>
body{margin:0;background:#f4f7f6;color:#17221f;font:16px/1.6 system-ui,sans-serif}.deck{max-width:980px;margin:32px auto;padding:24px}.slide{min-height:420px;margin:0 0 24px;padding:48px;border-radius:20px;background:#fff;box-shadow:0 4px 24px #17221f12;break-after:page}.slide small{color:#0e7c66}.slide h2{font-size:2rem}.slide li{margin:.75rem 0}@media print{body{background:#fff}.deck{margin:0;padding:0;max-width:none}.slide{min-height:0;height:100vh;margin:0;padding:12vh 10vw;border-radius:0;box-shadow:none}}
</style></head><body><main class="deck"><h1>${escapeHtml(title)}</h1>${slideMarkup}</main></body></html>`;
}

function PresentationsPage() {
  const { user } = useAuth();
  const generate = useServerFn(generatePresentationAI);
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("");
  const [slideCount, setSlideCount] = useState(6);
  const [title, setTitle] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [busy, setBusy] = useState(false);

  const createPresentation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      const result = await generate({
        data: { topic: topic.trim(), audience: audience.trim(), slideCount },
      });
      if (!result.ok) {
        if (("setupRequired" in result && result.setupRequired) || isAiSetupIssue(result.error))
          toast.info(result.error);
        else toast.error(result.error);
        return;
      }
      setTitle(result.presentation.title);
      setSlides(result.presentation.slides);
      toast.success("Presentation outline created. Edit any slide before exporting.");
    } catch {
      toast.error("The AI service is unavailable right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const updateSlide = (index: number, patch: Partial<Slide>) => {
    setSlides((current) =>
      current.map((slide, i) => (i === index ? { ...slide, ...patch } : slide)),
    );
  };

  const savePresentation = () => {
    if (!user || !slides.length) return;
    const content = slides
      .map((slide, index) => `Slide ${index + 1}: ${slide.title}\n${slide.content}`)
      .join("\n\n");
    createNote(user.id, {
      title: title || topic || "Presentation",
      subject: "Presentation",
      content,
    });
    toast.success("Presentation saved to your notes.");
  };

  const exportPresentation = () => {
    if (!slides.length) return;
    const html = buildPresentationHtml(title || topic || "Student Hub Presentation", slides);
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = `${
      (title || topic || "presentation")
        .replace(/[^a-z0-9-_ ]/gi, "")
        .trim()
        .replace(/\s+/g, "-") || "presentation"
    }.html`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <AppShell
      title="Presentation Maker"
      description="Generate a slide outline, edit the content, save it to Notes, and export a self-contained HTML deck that can be printed to PDF."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
        <form onSubmit={createPresentation} className="panel h-fit space-y-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
              <Presentation className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Start with a topic</h2>
              <p className="text-sm text-muted-foreground">
                AI-generated content is an editable draft.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentation-topic">Presentation topic</Label>
            <Textarea
              id="presentation-topic"
              required
              minLength={3}
              maxLength={300}
              rows={3}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g. How renewable energy storage works"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="presentation-audience">Audience (optional)</Label>
            <Input
              id="presentation-audience"
              maxLength={120}
              value={audience}
              onChange={(event) => setAudience(event.target.value)}
              placeholder="e.g. First-year biology students"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slide-count">Number of slides</Label>
            <Input
              id="slide-count"
              type="number"
              min={3}
              max={12}
              value={slideCount}
              onChange={(event) => setSlideCount(Number(event.target.value))}
            />
          </div>
          <Button
            type="submit"
            className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={busy}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{" "}
            Generate outline
          </Button>
          <p className="text-xs text-muted-foreground">
            Uses one daily AI question. Review facts and add sources before presenting.
          </p>
        </form>

        <section className="space-y-4">
          {slides.length ? (
            <>
              <div className="panel flex flex-wrap items-end justify-between gap-3 p-4">
                <div className="min-w-[14rem] flex-1 space-y-2">
                  <Label htmlFor="deck-title">Deck title</Label>
                  <Input
                    id="deck-title"
                    value={title}
                    maxLength={200}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" onClick={savePresentation}>
                    <Save className="size-4" /> Save
                  </Button>
                  <Button variant="outline" className="gap-2" onClick={exportPresentation}>
                    <Download className="size-4" /> Export HTML
                  </Button>
                </div>
              </div>
              {slides.map((slide, index) => (
                <article key={index} className="panel space-y-3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Slide {index + 1}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove slide ${index + 1}`}
                      disabled={slides.length <= 3}
                      onClick={() => setSlides((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                  <Input
                    aria-label={`Slide ${index + 1} title`}
                    value={slide.title}
                    maxLength={200}
                    onChange={(event) => updateSlide(index, { title: event.target.value })}
                  />
                  <Textarea
                    aria-label={`Slide ${index + 1} content`}
                    rows={4}
                    value={slide.content}
                    maxLength={2000}
                    onChange={(event) => updateSlide(index, { content: event.target.value })}
                  />
                  {index === slides.length - 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() =>
                        setSlides((current) => [...current, { title: "", content: "" }])
                      }
                      disabled={slides.length >= 12}
                    >
                      <Plus className="size-4" /> Add slide
                    </Button>
                  ) : null}
                </article>
              ))}
            </>
          ) : (
            <div className="panel flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <Presentation className="size-8 text-muted-foreground" />
              <h2 className="mt-3 font-semibold">Your slides will appear here</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Generate a structured outline, revise every title and bullet, then save or export
                your deck.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
