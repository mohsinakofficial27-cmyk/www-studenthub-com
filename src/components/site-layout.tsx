import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/features", label: "Features" },
  { to: "/study-tools", label: "Study Tools" },
  { to: "/pricing", label: "Pricing" },
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
  { title: "Product", links: [{ to: "/features", label: "Features" }, { to: "/study-tools", label: "Study Tools" }, { to: "/pricing", label: "Pricing" }] },
  { title: "Company", links: [{ to: "/about", label: "About" }, { to: "/dashboard", label: "Dashboard" }] },
  { title: "Account", links: [{ to: "/login", label: "Log in" }, { to: "/signup", label: "Sign up" }, { to: "/forgot-password", label: "Reset password" }] },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-navy text-navy-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-navy-foreground/65">Everything You Need to Study Smarter.</p>
        </div>
        {FOOTER_COLS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold">{col.title}</p>
            <div className="mt-4 flex flex-col gap-2.5 text-sm text-navy-foreground/65">
              {col.links.map((l) => (
                <Link key={l.to} to={l.to} className="hover:text-navy-foreground">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl justify-between border-t border-navy-foreground/10 px-4 py-5 text-xs text-navy-foreground/55 sm:px-6">
        <span>© {new Date().getFullYear()} Student Hub</span>
        <span>Built for students.</span>
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
