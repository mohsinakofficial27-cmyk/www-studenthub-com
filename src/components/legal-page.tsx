import type { ReactNode } from "react";

import { SitePage } from "@/components/site-layout";

export const CONTACT_EMAIL = "thestudenthub.connect@gmail.com";

export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <SitePage>
      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
        {updated ? <p className="mt-2 text-sm text-muted-foreground">Last updated: {updated}</p> : null}
        <div className="mt-8 space-y-6 leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </SitePage>
  );
}
