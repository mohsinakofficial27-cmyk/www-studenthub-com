import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Save, Sparkles, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createNote, createQuiz } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { studyPdfAI } from "@/lib/ai.functions";
import { isAiSetupIssue } from "@/lib/ai";

import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export const Route = createFileRoute("/_authenticated/pdf-reader")({
  head: () => ({
    meta: [
      { title: "AI PDF Reader — Student Hub" },
      {
        name: "description",
        content: "Read PDFs, ask questions, generate summaries and create study quizzes.",
      },
    ],
  }),
  component: PdfReaderPage,
});

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_PAGES = 100;
const MAX_TEXT_CHARS = 30000;

type PdfAction = "ask" | "summary" | "highlights" | "quiz";

function PdfReaderPage() {
  const { user } = useAuth();
  const runStudy = useServerFn(studyPdfAI);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState(0);

  const loadPdf = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Choose a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("This PDF is larger than 12 MB. Choose a smaller file.");
      return;
    }

    setLoadingPdf(true);
    setText("");
    setPageCount(0);
    setAnswer("");
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
      const pdfDocument = await loadingTask.promise;
      const totalPages = pdfDocument.numPages;
      let extracted = "";
      try {
        if (totalPages > MAX_PAGES) {
          toast.error(`This reader supports up to ${MAX_PAGES} pages at a time.`);
          return;
        }

        const pages: string[] = [];
        let totalChars = 0;
        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
            .filter(Boolean)
            .join(" ")
            .trim();
          const remainingChars = MAX_TEXT_CHARS - totalChars;
          if (remainingChars <= 0) break;
          const boundedPageText = pageText.slice(0, remainingChars);
          totalChars += boundedPageText.length;
          pages.push(`Page ${pageNumber}\n${boundedPageText}`);
        }
        extracted = pages.join("\n\n").slice(0, MAX_TEXT_CHARS);
      } finally {
        await loadingTask.destroy();
      }

      if (!extracted.trim()) {
        toast.error(
          "No selectable text was found. This may be a scanned PDF; OCR for scanned documents is not available in this reader yet.",
        );
        return;
      }
      setTitle(file.name.replace(/\.pdf$/i, "").slice(0, 200));
      setText(extracted);
      setPageCount(totalPages);
      toast.success(`Extracted text from ${totalPages} pages.`);
    } catch (error) {
      console.error("PDF extraction failed", error);
      toast.error("This PDF could not be opened. Try another file or a text-based PDF.");
    } finally {
      setLoadingPdf(false);
    }
  };

  const runAction = async (action: PdfAction) => {
    if (!user || text.trim().length < 40) {
      toast.error("Upload a PDF with selectable text before using the study tools.");
      return;
    }
    if (action === "ask" && !question.trim()) {
      toast.error("Enter a question about the document.");
      return;
    }
    setBusy(true);
    setAnswer("");
    try {
      const result = await runStudy({
        data: {
          action,
          title: title.trim() || "PDF document",
          content: text.slice(0, MAX_TEXT_CHARS),
          ...(action === "ask" ? { question: question.trim() } : {}),
          count: 5,
        },
      });
      if ("remaining" in result) setRemaining(result.remaining);
      if (!result.ok) {
        if (("setupRequired" in result && result.setupRequired) || isAiSetupIssue(result.error))
          toast.info(result.error);
        else toast.error(result.error);
        return;
      }
      if ("questions" in result) {
        createQuiz(user.id, {
          subject: "PDF study",
          topic: title.trim() || "PDF practice quiz",
          difficulty: "medium",
          questions: result.questions.map((item, index) => ({ ...item, id: `pdf-${index + 1}` })),
        });
        setAnswer(
          `${result.questions.length} questions created from “${title || "your PDF"}”. Your quiz is ready in Quiz Generator.`,
        );
        toast.success("Practice quiz created.");
      } else {
        setAnswer(result.content);
      }
    } catch {
      toast.error("The AI service is unavailable right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const saveToNotes = () => {
    if (!user || !text.trim()) return;
    createNote(user.id, { title: title || "PDF notes", subject: "PDF", content: text });
    toast.success("Extracted text saved to your notes.");
  };

  return (
    <AppShell
      title="AI PDF Reader"
      description="Extract text from a PDF, study its contents with AI, and save the document text as a private note."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <section className="panel space-y-4 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-accent-foreground">
              <FileText className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">Open a document</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Text is extracted in your browser. The original PDF is not uploaded; only text sent
                for an AI action is processed by the configured AI service.
              </p>
            </div>
          </div>
          <Label
            htmlFor="pdf-file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-8 text-center transition-colors hover:border-brand/60 hover:bg-brand-soft/30"
          >
            {loadingPdf ? (
              <Loader2 className="size-6 animate-spin text-accent-foreground" />
            ) : (
              <Upload className="size-6 text-accent-foreground" />
            )}
            <span className="mt-2 text-sm font-medium">
              {loadingPdf ? "Extracting PDF text…" : "Choose a PDF file"}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">Up to 12 MB and 100 pages</span>
          </Label>
          <input
            id="pdf-file"
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            disabled={loadingPdf || busy}
            onChange={(event) => {
              void loadPdf(event.currentTarget.files?.[0]);
              event.currentTarget.value = "";
            }}
          />

          {text ? (
            <>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <div className="space-y-2">
                  <Label htmlFor="pdf-title">Document title</Label>
                  <Input
                    id="pdf-title"
                    value={title}
                    maxLength={200}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>
                <Button type="button" variant="outline" className="gap-2" onClick={saveToNotes}>
                  <Save className="size-4" /> Save as note
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {pageCount} pages · {text.length.toLocaleString()} extracted characters
                {text.length >= MAX_TEXT_CHARS ? " (text capped at 30,000 characters)" : ""}
              </p>
              <div className="space-y-2">
                <Label htmlFor="pdf-text">Extracted text (editable)</Label>
                <Textarea
                  id="pdf-text"
                  rows={14}
                  value={text}
                  onChange={(event) => setText(event.target.value.slice(0, MAX_TEXT_CHARS))}
                />
              </div>
            </>
          ) : null}
        </section>

        <section className="panel h-fit space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Study this document</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each AI action uses one of your daily AI questions
              {remaining === null ? "." : ` · ${remaining} left today.`}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdf-question">Ask a question</Label>
            <Input
              id="pdf-question"
              value={question}
              maxLength={1000}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What are the main causes described?"
            />
            <Button
              className="w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={!text || busy}
              onClick={() => void runAction("ask")}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{" "}
              Ask about this PDF
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <Button
              variant="outline"
              disabled={!text || busy}
              onClick={() => void runAction("summary")}
            >
              Generate chapter summary
            </Button>
            <Button
              variant="outline"
              disabled={!text || busy}
              onClick={() => void runAction("highlights")}
            >
              Highlight key information
            </Button>
            <Button
              variant="outline"
              disabled={!text || busy}
              onClick={() => void runAction("quiz")}
            >
              Create a 5-question quiz
            </Button>
          </div>
          {answer ? (
            <div className="rounded-xl bg-surface p-4" aria-live="polite">
              <h3 className="text-sm font-semibold">Study result</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {answer}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}
