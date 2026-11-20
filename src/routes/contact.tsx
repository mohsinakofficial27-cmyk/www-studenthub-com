import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { CONTACT_EMAIL, LegalPage } from "@/components/legal-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Student Hub" },
      {
        name: "description",
        content: "Get in touch with the Student Hub team with questions, ideas or problems.",
      },
      { property: "og:title", content: "Contact — Student Hub" },
      { property: "og:description", content: "Send the Student Hub team a message." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(100),
  email: z.string().trim().email("Please enter a valid email.").max(255),
  message: z.string().trim().min(1, "Please write a message.").max(2000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setError("");
    setStatus("saving");
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getUser();
    const { error: dbError } = await supabase
      .from("contact_messages")
      .insert({ ...parsed.data, user_id: data.user?.id ?? null });
    if (dbError) {
      setStatus("idle");
      setError("Couldn't send your message — please try again.");
      return;
    }
    setStatus("done");
  }

  return (
    <LegalPage title="Contact us">
      <p>
        Questions, ideas or something not working? Send us a message below or email{" "}
        <a className="font-medium text-foreground underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
      {status === "done" ? (
        <div className="card-soft p-6 text-foreground">
          Thanks — your message has been sent. We'll reply by email.
        </div>
      ) : (
        <form onSubmit={submit} className="card-soft space-y-4 p-6 text-foreground">
          <label className="block text-sm font-semibold">
            Name
            <Input
              className="mt-2"
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block text-sm font-semibold">
            Email
            <Input
              className="mt-2"
              type="email"
              maxLength={255}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label className="block text-sm font-semibold">
            Message
            <Textarea
              className="mt-2"
              rows={5}
              maxLength={2000}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </label>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={status === "saving"}
            className="bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {status === "saving" ? "Sending…" : "Send message"}
          </Button>
        </form>
      )}
    </LegalPage>
  );
}
