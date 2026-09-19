import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center",
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-accent-foreground">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function InfoNote({ title, description }: { title: string; description: ReactNode }) {
  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}
