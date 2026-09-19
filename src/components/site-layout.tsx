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

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">Everything You Need to Study Smarter.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-sm text-muted-foreground sm:grid-cols-3">
          <Link to="/features" className="hover:text-foreground">
            Features
          </Link>
          <Link to="/study-tools" className="hover:text-foreground">
            Study Tools
          </Link>
          <Link to="/pricing" className="hover:text-foreground">
            Pricing
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/login" className="hover:text-foreground">
            Login
          </Link>
          <Link to="/signup" className="hover:text-foreground">
            Get Started
          </Link>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Student Hub. Built for students.
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
