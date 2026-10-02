import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Student Hub" },
      { name: "description", content: "Admin overview of student ratings." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Student Hub" },
      { property: "og:description", content: "Admin overview of student ratings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

type State =
  | { status: "loading" }
  | { status: "forbidden" }
  | { status: "error" }
  | { status: "ok"; ratings: number[] };

function AdminPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return setState({ status: "forbidden" });
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      if (!isAdmin) return setState({ status: "forbidden" });
      const { data, error } = await supabase.from("site_ratings").select("rating").limit(10000);
      if (error) return setState({ status: "error" });
      setState({ status: "ok", ratings: (data ?? []).map((r) => r.rating) });
    })();
  }, []);

  return (
    <AppShell title="Admin">
      {state.status === "loading" && <p className="text-sm text-muted-foreground">Loading ratings…</p>}
      {state.status === "forbidden" && (
        <EmptyState icon={ShieldAlert} title="Admins only" description="Your account doesn't have admin access." />
      )}
      {state.status === "error" && (
        <EmptyState icon={ShieldAlert} title="Couldn't load ratings" description="Please refresh and try again." />
      )}
      {state.status === "ok" && <RatingStats ratings={state.ratings} />}
    </AppShell>
  );
}

function RatingStats({ ratings }: { ratings: number[] }) {
  if (ratings.length === 0) {
    return <EmptyState icon={Star} title="No ratings yet" description="Ratings from the homepage will appear here." />;
  }
  const total = ratings.length;
  const avg = ratings.reduce((a, b) => a + b, 0) / total;
  const counts = [5, 4, 3, 2, 1].map((s) => ({ star: s, count: ratings.filter((r) => r === s).length }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="panel p-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Average score</p>
        <p className="mt-2 text-4xl font-semibold">{avg.toFixed(2)}<span className="text-lg text-muted-foreground"> / 5</span></p>
        <div className="mt-2 flex gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={s <= Math.round(avg) ? "size-5 fill-sun text-sun" : "size-5 fill-muted text-muted-foreground/40"} />
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">{total} rating{total === 1 ? "" : "s"} total</p>
      </div>
      <div className="panel p-6 lg:col-span-2">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Rating distribution</p>
        <ul className="mt-4 space-y-3">
          {counts.map(({ star, count }) => {
            const pct = (count / total) * 100;
            return (
              <li key={star} className="flex items-center gap-3 text-sm">
                <span className="w-10 shrink-0 font-medium">{star} ★</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-sun" style={{ width: `${pct}%` }} />
                </div>
                <span className="w-20 shrink-0 text-right text-muted-foreground">{count} · {pct.toFixed(0)}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
