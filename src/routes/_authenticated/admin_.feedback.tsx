import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["feedback"]["Row"];

export const Route = createFileRoute("/_authenticated/admin_/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback admin — Student Hub" },
      { name: "description", content: "Admin list of all Student Hub feedback." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Feedback admin — Student Hub" },
      { property: "og:description", content: "Admin list of all Student Hub feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminFeedbackPage,
});

type State = { status: "loading" } | { status: "forbidden" } | { status: "error" } | { status: "ok"; rows: Row[] };

function AdminFeedbackPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setState({ status: "forbidden" });
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return setState({ status: "forbidden" });
      const { data, error } = await supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(500);
      if (error) return setState({ status: "error" });
      setState({ status: "ok", rows: data ?? [] });
    })();
  }, []);

  return (
    <AppShell title="Feedback" description="All feedback, newest first.">
      {state.status === "loading" && <p className="text-sm text-muted-foreground">Loading feedback…</p>}
      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Admins only" description="Your account doesn't have admin access." />
      )}
      {state.status === "error" && (
        <EmptyState icon={ShieldAlert} title="Couldn't load feedback" description="Please refresh and try again." />
      )}
      {state.status === "ok" &&
        (state.rows.length === 0 ? (
          <EmptyState icon={MessageSquare} title="No feedback yet" description="Submissions from /feedback will appear here." />
        ) : (
          <ul className="space-y-3">
            {state.rows.map((r) => (
              <li key={r.id} className="panel p-5 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-sun">{"★".repeat(r.rating)}<span className="text-muted-foreground/40">{"★".repeat(5 - r.rating)}</span></span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} · {r.user_id ? "Signed-in user" : "Guest"}
                  </span>
                </div>
                <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Item label="Likes most" value={r.likes} />
                  <Item label="Not working / confusing" value={r.issues} />
                  <Item label="Wants next" value={r.wanted_feature} />
                </dl>
              </li>
            ))}
          </ul>
        ))}
    </AppShell>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}
