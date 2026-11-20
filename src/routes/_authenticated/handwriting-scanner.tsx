import { createFileRoute } from "@tanstack/react-router";
import { FileImage, Loader2, ScanText, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { createNote } from "@/lib/data";
import { formatOcrText } from "@/lib/study-tools";

export const Route = createFileRoute("/_authenticated/handwriting-scanner")({
  component: HandwritingScannerPage,
});

const OCR_LANGUAGES = ["eng", "urd", "hin"] as const;

function HandwritingScannerPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState<"eng" | "urd" | "hin">("eng");
  const [content, setContent] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const chooseImage = (image: File | undefined) => {
    if (!image) return;
    if (!image.type.startsWith("image/") || image.size > 12 * 1024 * 1024) {
      toast.error("Choose an image file smaller than 12 MB.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(image);
    setPreviewUrl(URL.createObjectURL(image));
    setTitle((current) => current || image.name.replace(/\.[^.]+$/u, ""));
    setContent("");
  };

  const scan = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker(language, 1, {
        logger: (message) => {
          if (message.status === "recognizing text")
            setProgress(Math.round(message.progress * 100));
        },
      });
      try {
        const result = await worker.recognize(file);
        const text = formatOcrText(result.data.text);
        if (!text.trim()) {
          toast.info("No text was detected. Try a sharper, well-lit image or type the text below.");
          return;
        }
        setContent(text);
        toast.success("Text extracted. Review it carefully before saving.");
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      console.error("Handwriting OCR failed", error);
      toast.error(
        "OCR could not load or read this image. You can still type or edit the notes below.",
      );
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!user || !content.trim()) {
      toast.error("Add or scan some note text first.");
      return;
    }
    createNote(user.id, { title, subject: subject.trim() || "General", content: content.trim() });
    setContent("");
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    toast.success("Scanned notes saved to your notes.");
  };

  return (
    <AppShell
      title="Handwriting-to-Digital Notes"
      description="Scan a notebook photo, review the OCR result, then save an editable note."
    >
      <InfoNote
        title="Private photo-to-notes scanning"
        description="Runs privately in your browser. First scan may take a moment to load language data—please review names, formulas, and numbers before saving."
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
        <section className="panel space-y-4 p-5">
          <label
            htmlFor="handwriting-photo"
            className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center"
          >
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Notebook page preview"
                className="max-h-60 rounded-lg object-contain"
              />
            ) : (
              <>
                <FileImage className="size-8 text-brand" />
                <span className="mt-3 text-sm font-medium">Choose a notebook photo</span>
                <span className="mt-1 text-xs text-muted-foreground">
                  PNG, JPEG, or another browser-supported image · up to 12 MB
                </span>
              </>
            )}
          </label>
          <input
            id="handwriting-photo"
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(event) => chooseImage(event.target.files?.[0])}
          />
          <label htmlFor="ocr-language" className="text-sm font-medium">
            Handwriting language
          </label>
          <select
            id="ocr-language"
            value={language}
            onChange={(event) =>
              setLanguage(OCR_LANGUAGES.find((item) => item === event.target.value) ?? "eng")
            }
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="eng">English</option>
            <option value="urd">Urdu</option>
            <option value="hin">Hindi</option>
          </select>
          <Button
            onClick={() => void scan()}
            disabled={!file || busy}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Reading image · {progress}%
              </>
            ) : (
              <>
                <ScanText className="size-4" /> Extract text
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            No image OCR data is uploaded to Student Hub. The Tesseract worker/language model is
            fetched from its public CDN when required.
          </p>
        </section>
        <section className="panel space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Note title"
              aria-label="Note title"
            />
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Subject (optional)"
              aria-label="Subject"
            />
          </div>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="OCR text will appear here. You can edit or type notes manually."
            className="min-h-72"
          />
          <Button
            onClick={save}
            disabled={!content.trim()}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Save className="size-4" /> Save as study note
          </Button>
        </section>
      </div>
    </AppShell>
  );
}
