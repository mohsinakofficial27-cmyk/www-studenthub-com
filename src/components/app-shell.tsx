import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BookOpenCheck,
  Sparkles,
  Calculator,
  Focus,
  HeartPulse,
  FileText,
  GraduationCap,
  ScanLine,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  MessageCircleHeart,
  LayoutGrid,
  Layers,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Mic,
  MicVocal,
  MoonStar,
  Presentation,
  ScanSearch,
  ScanText,
  Search,
  Share2,
  Settings2,
  Timer,
  TrendingUp,
  Repeat2,
  User,
  Users,
  Video,
  Zap,
  LockKeyhole,
} from "lucide-react";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth, useDb } from "@/lib/auth";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { usePwaInstall } from "@/lib/pwa";
import {
  discardPendingOfflineChanges,
  hasSyncConflict as hasPendingSyncConflict,
  mutate,
} from "@/lib/store";
import { cn } from "@/lib/utils";

export const APP_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/assistant", label: "AI Study Assistant", icon: MessageSquare },
  { to: "/coach", label: "AI Coach", icon: Sparkles },
  { to: "/notes", label: "AI Notes", icon: BookOpen },
  { to: "/pdf-reader", label: "AI PDF Reader", icon: FileText },
  { to: "/voice-tutor", label: "AI Voice Tutor", icon: Mic },
  { to: "/presentations", label: "Presentation Maker", icon: Presentation },
  { to: "/quizzes", label: "Quiz Generator", icon: ListChecks },
  { to: "/planner", label: "Study Planner", icon: CalendarDays },
  { to: "/courses", label: "Courses", icon: GraduationCap },
  { to: "/gpa", label: "GPA Center", icon: Calculator },
  { to: "/academic-tools", label: "Academic Toolkit", icon: BookOpenCheck },
  { to: "/community", label: "Community", icon: Users },
  { to: "/syllabus", label: "Syllabus Scanner", icon: ScanLine },
  { to: "/study-mode", label: "Study Mode", icon: Focus },
  { to: "/study-room", label: "Group Study Room", icon: Video },
  { to: "/concept-challenger", label: "Concept Challenger", icon: BrainCircuit },
  { to: "/exam-crammer", label: "Midnight Exam Crammer", icon: Zap },
  { to: "/sleep-optimizer", label: "Sleep & Study Optimizer", icon: MoonStar },
  { to: "/mistake-analyzer", label: "Mistake Analyzer", icon: ScanSearch },
  { to: "/parent-report", label: "Parent Progress Report", icon: Share2 },
  { to: "/handwriting-scanner", label: "Handwriting Scanner", icon: ScanText },
  { to: "/exam-calm", label: "Exam Calm", icon: HeartPulse },
  { to: "/note-exchange", label: "Note Exchange & Bounties", icon: Repeat2 },
  { to: "/mock-viva", label: "Mock Viva", icon: MicVocal },
  { to: "/study-lock", label: "Distraction Blocker", icon: LockKeyhole },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/pomodoro", label: "Pomodoro", icon: Timer },
  { to: "/progress", label: "Progress", icon: TrendingUp },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings2 },
  { to: "/feedback", label: "Feedback", icon: MessageCircleHeart },
] as const;

const MOBILE_NAV = [
  { to: "/dashboard", key: "home", icon: LayoutGrid },
  { to: "/assistant", key: "askAi", icon: MessageSquare },
  { to: "/study-mode", key: "focus", icon: Timer },
  { to: "/planner", key: "plan", icon: CalendarDays },
  { to: "/progress", key: "progress", icon: TrendingUp },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const keys: Record<string, MessageKey> = {
    "/dashboard": "dashboard",
    "/assistant": "assistant",
    "/coach": "coach",
    "/notes": "notes",
    "/pdf-reader": "pdfReader",
    "/voice-tutor": "voiceTutor",
    "/presentations": "presentations",
    "/quizzes": "quizzes",
    "/planner": "planner",
    "/courses": "courses",
    "/gpa": "gpa",
    "/syllabus": "syllabus",
    "/study-mode": "studyMode",
    "/flashcards": "flashcards",
    "/pomodoro": "pomodoro",
    "/progress": "progress",
    "/profile": "profile",
    "/settings": "settings",
    "/feedback": "feedback",
  };
  return (
    <nav className="space-y-0.5">
      {APP_NAV.map(({ to, label, icon: Icon }, index) => (
        <Fragment key={to}>
          {index === 1 ? (
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("aiLearning")}
            </p>
          ) : null}
          {index === 7 ? (
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {t("studyWorkspace")}
            </p>
          ) : null}
          {index === 16 ? (
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Exam toolkit
            </p>
          ) : null}
          {index === 21 ? (
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Wellness & focus
            </p>
          ) : null}
          {index === 26 ? (
            <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              Study & progress
            </p>
          ) : null}
          <Link
            to={to}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            activeProps={{ className: "bg-brand-soft text-accent-foreground font-medium" }}
          >
            <Icon className="size-4 shrink-0" />
            {keys[to] ? t(keys[to]) : label}
          </Link>
        </Fragment>
      ))}
    </nav>
  );
}

function NotificationsBell() {
  const { user } = useAuth();
  const { t } = useI18n();
  const db = useDb();
  const items = db.notifications
    .filter((n) => n.user_id === user?.id && n.kind !== "billing")
    .slice(0, 8);
  const unread = items.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications")}>
          <Bell className="size-5" />
          {unread > 0 ? (
            <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-brand" aria-hidden />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{t("notifications")}</p>
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
              {t("markAllRead")}
            </button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {t("noNotifications")}
            </p>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "border-b border-border px-4 py-3 last:border-0",
                  !n.read && "bg-brand-soft/40",
                )}
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-3">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link to="/settings">{t("settings")}</Link>
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
  const { t, rtl } = useI18n();
  const { canInstall, install } = usePwaInstall();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const [hasSyncConflict, setHasSyncConflict] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasPendingSyncConflict()) setHasSyncConflict(true);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onConflict = () => setHasSyncConflict(true);
    const onSyncError = () => toast.error(t("syncError"));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("studenthub-sync-conflict", onConflict);
    window.addEventListener("studenthub-sync-error", onSyncError);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("studenthub-sync-conflict", onConflict);
      window.removeEventListener("studenthub-sync-error", onSyncError);
    };
  }, [t]);

  const handleSignOut = () => {
    signOut();
    void navigate({ to: "/", replace: true });
  };
  const translatedTitleKeys: Record<string, MessageKey> = {
    Dashboard: "dashboard",
    "AI Study Assistant": "assistant",
    "AI Student Coach": "coach",
    "AI Notes": "notes",
    "AI PDF Reader": "pdfReader",
    "AI Voice Tutor": "voiceTutor",
    "Presentation Maker": "presentations",
    "Quiz Generator": "quizzes",
    "Study Planner": "planner",
    Courses: "courses",
    "GPA Center": "gpa",
    "Syllabus Scanner": "syllabus",
    "Study Mode": "studyMode",
    Flashcards: "flashcards",
    Pomodoro: "pomodoro",
    Progress: "progress",
    Profile: "profile",
    Settings: "settings",
    Feedback: "feedback",
  };

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 hidden w-64 flex-col border-e border-border bg-sidebar px-4 py-5 lg:flex">
        <Logo to="/dashboard" />
        <div className="mt-7 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-4" /> {t("logout")}
        </button>
      </aside>

      <div className="lg:ps-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={rtl ? "right" : "left"} className="w-72 overflow-y-auto p-5">
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
                <LogOut className="size-4" /> {t("logout")}
              </button>
            </SheetContent>
          </Sheet>

          <div className="ms-auto flex items-center gap-2">
            <span
              role="status"
              className="hidden rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground sm:inline"
              aria-label={online ? t("online") : t("offline")}
            >
              {online ? t("online") : t("offline")}
            </span>
            {canInstall ? (
              <Button variant="outline" size="sm" onClick={() => void install()}>
                {t("install")}
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="gap-2 text-muted-foreground sm:w-64 sm:justify-start"
            >
              <Link to="/search">
                <Search className="size-4" />
                <span className="hidden sm:inline">{t("search")}</span>
              </Link>
            </Button>
            <NotificationsBell />
            <Link
              to="/profile"
              className="grid size-9 place-items-center rounded-full text-sm font-semibold text-brand-foreground"
              style={{ backgroundColor: profile?.avatar_color ?? "#0e7c66" }}
              aria-label={t("profile")}
            >
              {(profile?.name ?? "S").slice(0, 1).toUpperCase()}
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {!online ? (
            <p
              role="status"
              className="mb-4 rounded-xl border border-border bg-secondary px-4 py-2 text-sm"
            >
              {t("offline")} · {t("offlineHelp")}
            </p>
          ) : null}
          {hasSyncConflict ? (
            <div
              role="alert"
              className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
            >
              <span>{t("offlineConflict")}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await discardPendingOfflineChanges();
                    window.location.reload();
                  } catch (error) {
                    console.error("Could not discard the conflicting offline copy", error);
                    toast.error("Could not clear offline changes. Please try again.");
                  }
                }}
              >
                {t("discardLocalReload")}
              </Button>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">
                {translatedTitleKeys[title] ? t(translatedTitleKeys[title]) : title}
              </h1>
              {description ? (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          <div className="mt-6">{children}</div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {MOBILE_NAV.map(({ to, key, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
              activeProps={{ className: "text-accent-foreground" }}
            >
              <Icon className="size-5" />
              {t(key)}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
