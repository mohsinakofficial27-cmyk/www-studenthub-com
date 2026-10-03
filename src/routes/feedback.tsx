import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { SectionHeading } from "@/components/brand";
import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Student Hub" },
      { name: "description", content: "Tell us what you like, what's confusing and what you want next in Student Hub." },
      { property: "og:title", content: "Feedback — Student Hub" },
      { property: "og:description", content: "Help shape Student Hub with your feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedbackPage,
});

const schema = z.object({
  rating: z.number().int().min(1, "Please choose a star rating.").max(5),
  likes: z.string().trim().max(2000),
  issues: z.string().trim().max(2000),
  wanted_feature: z.string().trim().max(2000),
  would_pay: z.boolean(),
  fair_price: z.string().trim().max(100),
});

function FeedbackPage() {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [likes, setLikes] = useState("");
  const [issues, setIssues] = useState("");
  const [wanted, setWanted] = useState("");
  const [wouldPay, setWouldPay] = useState(false);
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({
      rating,
      likes,
      issues,
      wanted_feature: wanted,
      would_pay: wouldPay,
      fair_price: wouldPay ? price : "",
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setError("");
    setStatus("saving");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("feedback").insert({ ...parsed.data, user_id: data.user?.id ?? null });
    if (dbError) {
      setStatus("idle");
      setError("Couldn't send your feedback — please try again.");
      return;
    }
    setStatus("done");
  }

  return (
    <SitePage>
      <section className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
        <SectionHeading
          as="h1"
          eyebrow="Your feedback"
          title="How was your experience with Student Hub?"
          subtitle="Two minutes of your time helps us build what students actually need."
        />
        {status === "done" ? (
          <div className="card-soft mt-10 p-8 text-center">
            <p className="text-2xl font-semibold">Thanks for your feedback!</p>
            <p className="mt-2 text-muted-foreground">We read every response.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card-soft mt-10 space-y-6 p-6 sm:p-8">
            <fieldset>
              <legend className="text-sm font-semibold">Your rating</legend>
              <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating out of 5 stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="grid size-12 place-items-center rounded-full transition-transform hover:scale-110"
                  >
                    <Star
                      className={cn(
                        "size-9",
                        star <= (hovered || rating) ? "fill-sun text-sun" : "fill-muted text-muted-foreground/40",
                      )}
                    />
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label="What do you like most?" value={likes} onChange={setLikes} />
            <Field label="What is not working or confusing?" value={issues} onChange={setIssues} />
            <Field label="What feature would you want next?" value={wanted} onChange={setWanted} />
            <label className="flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={wouldPay}
                onChange={(e) => setWouldPay(e.target.checked)}
                className="size-4 accent-[var(--brand)]"
              />
              I would pay for a premium version
            </label>
            {wouldPay ? (
              <label className="block text-sm font-semibold">
                How much per month would feel fair? <span className="font-normal text-muted-foreground">(optional)</span>
                <Input className="mt-2" value={price} maxLength={100} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. $5" />
              </label>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={status === "saving"} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
              {status === "saving" ? "Sending…" : "Send feedback"}
            </Button>
          </form>
        )}
      </section>
    </SitePage>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      <Textarea className="mt-2" rows={3} maxLength={2000} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
