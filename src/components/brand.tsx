import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";

export function Logo({ className, to = "/" }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn("flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-primary font-display text-lg font-semibold text-primary-foreground">
        S
      </span>
      <span className="font-display text-lg font-semibold tracking-tight">Student Hub</span>
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  className,
  as: Heading = "h2",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      {eyebrow ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-accent-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          {eyebrow}
        </span>
      ) : null}
      <Heading className="mt-4 text-3xl font-semibold sm:text-4xl">{title}</Heading>
      {subtitle ? <p className="mt-3 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}
