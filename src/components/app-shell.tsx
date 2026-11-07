import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Sparkles,
  Calculator,
  Focus,
  GraduationCap,
  ScanLine,
  BookOpen,
  CalendarDays,
  MessageCircleHeart,
  LayoutGrid,
  Layers,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Timer,
  TrendingUp,
  User,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, useDb } from "@/lib/auth";
import { mutate } from "@/lib/store";
import { cn } from "@/lib/utils";

export const APP_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/assistant", label: "AI Study Assistant", icon: MessageSquare },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/notes", label: "AI Notes", icon: BookOpen },
  { to: "/quizzes", label: "Quiz Generator", icon: ListChecks },
  { to: "/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/courses", label: "Courses", icon: GraduationCap },
  { to: "/gpa", label: "GPA Center", icon: Calculator },
  { to: "/syllabus", label: "Syllabus Scanner", icon: ScanLine },
  { to: "/study-mode", label: "Study Mode", icon: Focus },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/feedback", label: "Feedback", icon: MessageCircleHeart },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutGrid },
  { to: "/assistant", label: "Ask AI", icon: MessageSquare },
  { to: "/study-mode", label: "Focus", icon: Timer },
  { to: "/planner", label: "Plan", icon: CalendarDays },
  { to: "/progress", label: "Progress", icon: TrendingUp },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="space-y-0.5">
      {APP_NAV.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          activeProps={{ className: "bg-brand-soft text-accent-foreground font-medium" }}
        >
          <Icon className="size-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

function NotificationsBell() {
  const { user } = useAuth();
  const db = useDb();
  const items = db.notifications.filter((n) => n.user_id === user?.id).slice(0, 8);
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-brand" aria-hidden />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {items.length ? (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                mutate((d) => {
                  d.notifications.forEach((n) => {
                    if (n.user_id === user?.id) n.read = true;
                  });
                })
              }
            >
              Mark all read
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet. Reminders for tasks, exams and streaks appear here.
            </p>
          ) : (
            items.map((n) => (
              <div key={n.id} className={cn("border-b border-border px-4 py-3 last:border-0", !n.read && "bg-brand-soft/40")}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-3">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/profile">Notification settings</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    signOut();
    void navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-5 lg:flex">
        <Logo to="/dashboard" />
        <div className="mt-7 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4" /> Logout
        </button>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto p-5">
              <Logo to="/dashboard" className="mt-2" />
              <div className="mt-6">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  handleSignOut();
                }}
                className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </SheetContent>
          </Sheet>

          <Button asChild variant="outline" className="ml-auto gap-2 text-muted-foreground sm:w-64 sm:justify-start">
            <Link to="/search">
              <Search className="size-4" />
              <span className="hidden sm:inline">Search your study content</span>
            </Link>
          </Button>
          <NotificationsBell />
          <Link
            to="/profile"
            className="grid size-9 place-items-center rounded-full text-sm font-semibold text-brand-foreground"
            style={{ backgroundColor: profile?.avatar_color ?? "#0e7c66" }}
            aria-label="Profile"
          >
            {(profile?.name ?? "S").slice(0, 1).toUpperCase()}
          </Link>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
              {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          <div className="mt-6">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-accent-foreground" }}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
