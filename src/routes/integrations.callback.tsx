import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { SitePage } from "@/components/site-layout";
import { Button } from "@/components/ui/button";
import { completeProviderConnection } from "@/lib/integrations.functions";

const searchSchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const Route = createFileRoute("/integrations/callback")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Complete connection — Student Hub" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: IntegrationCallbackPage,
});

function IntegrationCallbackPage() {
  const { code, state, error } = Route.useSearch();
  const navigate = useNavigate();
  const started = useRef(false);
  const [message, setMessage] = useState("Completing secure provider connection…");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    if (error || !code || !state) {
      setMessage("The provider connection was cancelled or returned an incomplete response.");
      setFailed(true);
      return;
    }
    void completeProviderConnection({ data: { code, state } })
      .then(({ provider }) => {
        toast.success(`${provider.replaceAll("_", " ")} connected.`);
        void navigate({ to: "/settings", replace: true });
      })
      .catch((cause: unknown) => {
        console.error("Provider authorization could not be completed", cause);
        setMessage(
          cause instanceof Error
            ? cause.message
            : "The provider connection could not be completed.",
        );
        setFailed(true);
      });
  }, [code, error, navigate, state]);

  return (
    <SitePage>
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Provider connection</h1>
        <p className="mt-3 text-sm text-muted-foreground" role={failed ? "alert" : "status"}>
          {message}
        </p>
        {failed ? (
          <Button className="mt-5" onClick={() => void navigate({ to: "/settings" })}>
            Return to Settings
          </Button>
        ) : null}
      </main>
    </SitePage>
  );
}
