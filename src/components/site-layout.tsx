import { Link } from "@tanstack/react-router";
import { ChevronDown, Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/study-tools", label: "Study Tools" },
  { to: "/pricing", label: "Free Plan" },
  { to: "/about", label: "About" },
] as const;

function AuthActions({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  if (user) {
    return (
      <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
        <Link to="/dashboard" onClick={onNavigate}>
          Go to dashboard
        </Link>
      </Button>
    );
  }
  return (
    <>
      <Button asChild variant="ghost">
        <Link to="/login" onClick={onNavigate}>
          Login
        </Link>
      </Button>
      <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
        <Link to="/signup" onClick={onNavigate}>
          Get Started
        </Link>
      </Button>
    </>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground font-medium" }}
              className="transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-1.5 lg:flex">
          <AuthActions />
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-6">
            <nav className="mt-8 flex flex-col gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                  activeOptions={{ exact: item.to === "/" }}
                  activeProps={{ className: "bg-secondary text-foreground font-medium" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-6 flex flex-col gap-2">
              <AuthActions onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

const FOOTER_COLS = [
  {
    title: "Study",
    links: [
      { to: "/planner", label: "Study Planner" },
      { to: "/flashcards", label: "Flashcards" },
      { to: "/quizzes", label: "Quiz Generator" },
      { to: "/pomodoro", label: "Pomodoro Timer" },
      { to: "/progress", label: "Study Progress" },
    ],
  },
  {
    title: "AI Tools",
    links: [
      { to: "/assistant", label: "AI Study Assistant" },
      { to: "/notes", label: "AI Notes" },
      { to: "/quizzes", label: "Practice Quizzes" },
    ],
  },
  {
    title: "Productivity",
    links: [
      { to: "/notes", label: "My Notes" },
      { to: "/planner", label: "Tasks & Exams" },
      { to: "/pomodoro", label: "Focus Sessions" },
      { to: "/search", label: "Search" },
    ],
  },
  {
    title: "Discover",
    links: [
      { to: "/features", label: "Features" },
      { to: "/study-tools", label: "Study Tools" },
      { to: "/pricing", label: "Free Plan" },
      { to: "/feedback", label: "Feedback" },
      { to: "/about", label: "About Student Hub" },
      { to: "/contact", label: "Contact" },
      { to: "/privacy", label: "Privacy Policy" },
      { to: "/terms", label: "Terms of Use" },
    ],
  },
  {
    title: "Account",
    links: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/profile", label: "Profile" },
      { to: "/login", label: "Log in" },
      { to: "/signup", label: "Get Started" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 lg:pb-16 lg:pt-20">
        <div className="flex flex-col gap-4 border-b border-navy-foreground/15 pb-10 sm:flex-row sm:items-end sm:justify-between lg:pb-14">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-foreground/65">Your AI-powered student workspace.</p>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-navy-foreground/65 sm:text-right">Your space to learn, plan and stay focused.</p>
        </div>
        <nav aria-label="Footer navigation" className="pt-2 lg:pt-12">
          <div className="divide-y divide-navy-foreground/15 md:hidden">
            {FOOTER_COLS.map((col) => (
              <details key={col.title} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between py-5 text-sm font-semibold marker:content-none [&::-webkit-details-marker]:hidden">
                  {col.title}
                  <ChevronDown className="size-4 text-navy-foreground/60 transition-transform group-open:rotate-180" aria-hidden="true" />
                </summary>
                <div className="flex flex-col gap-3 pb-6 text-sm text-navy-foreground/65">
                  {col.links.map((link) => (
                    <Link key={`${col.title}-${link.label}`} to={link.to} className="w-fit transition-colors hover:text-navy-foreground focus-visible:text-navy-foreground">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
          <div className="hidden grid-cols-3 gap-x-8 gap-y-12 md:grid lg:grid-cols-5">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <p className="font-display text-sm font-semibold">{col.title}</p>
                <div className="mt-6 flex flex-col gap-3 text-sm text-navy-foreground/65">
                  {col.links.map((link) => (
                    <Link key={`${col.title}-${link.label}`} to={link.to} className="w-fit leading-relaxed transition-colors hover:text-navy-foreground focus-visible:text-navy-foreground">
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>
      </div>
      <div className="border-t border-navy-foreground/15">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-navy-foreground/55 sm:px-6">
          <span>© {new Date().getFullYear()} Student Hub. All rights reserved.</span>
          <span>Built for students.</span>
        </div>
      </div>
    </footer>
  );
}

export function SitePage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
