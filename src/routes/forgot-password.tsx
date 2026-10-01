import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AuthCard } from "@/components/auth-card";
import { ErrorNote, InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Forgot password — Student Hub" },
      { name: "description", content: "Request a password reset for your Student Hub account." },
      { property: "og:title", content: "Forgot password — Student Hub" },
      { property: "og:description", content: "Reset your Student Hub password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { requestReset } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      setToken(await requestReset(email));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the reset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title="Reset your password"
      subtitle="We'll create a reset code for your account."
      footer={
        <>
          Remembered it?{" "}
          <Link to="/login" className="font-medium text-foreground underline">
            Back to login
          </Link>
        </>
      }
    >
      {token ? (
        <div className="space-y-4">
          <InfoNote
            title="No email provider connected yet"
            description="Your reset code is shown here instead of being emailed. Connect an email service to send it properly."
          />
          <p className="rounded-xl bg-surface px-4 py-3 font-mono text-sm break-all">{token}</p>
          <Button asChild className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            <Link to="/reset-password" search={{ token }}>
              Continue to reset password
            </Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error ? <ErrorNote title="Reset failed" description={error} /> : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
            {busy ? "Working…" : "Send reset code"}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
