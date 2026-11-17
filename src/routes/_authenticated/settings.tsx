import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Download, RefreshCw, Smartphone, Trash2, Unplug } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth, useDb } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usePwaInstall } from "@/lib/pwa";
import { getCommunitySnapshot } from "@/lib/community.functions";
import {
  beginProviderConnection,
  disconnectProvider,
  getProviderStatus,
  importLmsContent,
  saveCalendarSyncPreferences,
  syncCalendarEvents,
  type IntegrationProvider,
} from "@/lib/integrations.functions";
import { mutate, refreshUserData, type SettingsRow, type UserRow } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Student Hub" },
      {
        name: "description",
        content: "Manage your language, regional, accessibility and privacy preferences.",
      },
    ],
  }),
  component: SettingsPage,
});

const LANGUAGES: { value: SettingsRow["language"]; label: string }[] = [
  { value: "en", label: "English" },
  { value: "ur", label: "اردو" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "ar", label: "العربية" },
];

const COUNTRIES = [
  ["PK", "Pakistan"],
  ["US", "United States"],
  ["GB", "United Kingdom"],
  ["IN", "India"],
  ["CA", "Canada"],
  ["AU", "Australia"],
  ["OTHER", "Other"],
] as const;

const GRADING_SYSTEMS: { value: SettingsRow["grading_system"]; label: string }[] = [
  { value: "gpa4", label: "GPA — 4.0 scale" },
  { value: "gpa5", label: "GPA — 5.0 scale" },
  { value: "percentage", label: "Percentage" },
  { value: "letter", label: "Letter grades" },
  { value: "uk", label: "UK degree classifications" },
];

function downloadFile(filename: string, content: string, mimeType: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(value: unknown) {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  let firstMeaningfulCharacter: string | undefined;
  for (const character of raw) {
    const code = character.codePointAt(0) ?? 0;
    const isIgnored = character.trim() === "" || code <= 0x1f || (code >= 0x7f && code <= 0x9f);
    if (!isIgnored) {
      firstMeaningfulCharacter = character;
      break;
    }
  }
  const text =
    firstMeaningfulCharacter && ["=", "+", "-", "@"].includes(firstMeaningfulCharacter)
      ? `'${raw}`
      : raw;
  return `"${text.replaceAll('"', '""')}"`;
}

function SettingsPage() {
  const { user, deleteAccount } = useAuth();
  const db = useDb();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { canInstall, installed, install } = usePwaInstall();
  const settings = db.user_settings.find((row) => row.user_id === user?.id);
  const [timeZoneInput, setTimeZoneInput] = useState(settings?.time_zone ?? "UTC");
  const [timeZoneError, setTimeZoneError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user || !settings) return null;

  const updateSettings = (patch: Partial<SettingsRow>) => {
    mutate((data) => {
      const current = data.user_settings.find((row) => row.user_id === user.id);
      if (current) Object.assign(current, patch);
    });
  };

  const exportJson = async () => {
    let community: unknown = null;
    let communityExportError = "";
    try {
      community = await getCommunitySnapshot();
    } catch (error) {
      console.error("Could not include community records in the export", error);
      communityExportError =
        "Community records were unavailable; apply the community migration or retry the export.";
    }
    const userRows = <T extends { user_id: string }>(rows: T[]) =>
      rows.filter((row) => row.user_id === user.id);
    const account = {
      exported_at: new Date().toISOString(),
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
      profile: db.profiles.find((row) => row.user_id === user.id) ?? null,
      settings,
      courses: userRows(db.courses),
      notes: userRows(db.notes),
      quizzes: userRows(db.quizzes),
      quiz_attempts: userRows(db.quiz_attempts),
      flashcard_decks: userRows(db.flashcard_decks),
      flashcards: userRows(db.flashcards),
      planner_events: userRows(db.study_tasks),
      study_sessions: userRows(db.study_sessions),
      assignment_rubrics: userRows(db.assignment_rubrics),
      exam_roadmaps: userRows(db.exam_roadmaps),
      research_sources: userRows(db.research_sources),
      applications: userRows(db.applications),
      budget_profile: db.budget_profiles.find((row) => row.user_id === user.id) ?? null,
      budget_entries: userRows(db.budget_entries),
      community,
      community_export_error: communityExportError || undefined,
      ai_conversations: userRows(db.ai_conversations),
      ai_messages: userRows(db.ai_messages),
      notifications: userRows(db.notifications),
    };
    downloadFile("student-hub-data.json", JSON.stringify(account, null, 2), "application/json");
    if (communityExportError) toast.info(communityExportError);
    else toast.success("Your data export is ready.");
  };

  const exportCsv = async () => {
    let community: Record<string, unknown> | null = null;
    let communityExportError = "";
    try {
      const value = await getCommunitySnapshot();
      if (value && typeof value === "object" && !Array.isArray(value)) {
        community = value as Record<string, unknown>;
      }
    } catch (error) {
      console.error("Could not include community records in the CSV export", error);
      communityExportError =
        "Community records were unavailable; apply the community migration or retry the export.";
    }
    const budgetPlan = db.budget_profiles.find((row) => row.user_id === user.id);
    const records = [
      ...db.courses
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "course",
          id: row.id,
          title: row.name,
          subject: "",
          date: "",
          details: row,
        })),
      ...db.notes
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "note",
          id: row.id,
          title: row.title,
          subject: row.subject,
          date: row.updated_at,
          details: row,
        })),
      ...db.flashcard_decks
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "flashcard deck",
          id: row.id,
          title: row.name,
          subject: row.subject,
          date: row.created_at,
          details: { ...row, cards: db.flashcards.filter((card) => card.deck_id === row.id) },
        })),
      ...db.study_tasks
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "planner event",
          id: row.id,
          title: row.title,
          subject: row.subject,
          date: row.date,
          details: row,
        })),
      ...db.quizzes
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "quiz",
          id: row.id,
          title: row.topic,
          subject: row.subject,
          date: row.created_at,
          details: row,
        })),
      ...db.assignment_rubrics
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "assignment rubric",
          id: row.id,
          title: row.title,
          subject: row.subject,
          date: row.updated_at,
          details: row,
        })),
      ...db.exam_roadmaps
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "exam roadmap",
          id: row.id,
          title: row.exam_title,
          subject: row.subject,
          date: row.exam_date,
          details: row,
        })),
      ...db.research_sources
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "research source",
          id: row.id,
          title: row.title,
          subject: row.category,
          date: row.published_at,
          details: row,
        })),
      ...db.applications
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: `${row.kind} application`,
          id: row.id,
          title: row.institution,
          subject: row.program,
          date: row.deadline,
          details: row,
        })),
      ...db.budget_entries
        .filter((row) => row.user_id === user.id)
        .map((row) => ({
          type: "budget entry",
          id: row.id,
          title: row.description || row.category,
          subject: row.category,
          date: row.date,
          details: row,
        })),
      ...(budgetPlan
        ? [
            {
              type: "monthly budget plan",
              id: user.id,
              title: "Monthly budget",
              subject: "",
              date: "",
              details: budgetPlan,
            },
          ]
        : []),
      ...(community
        ? Object.entries(community).flatMap(([kind, rows]) =>
            Array.isArray(rows)
              ? rows.map((row, index) => ({
                  type: `community ${kind}`,
                  id:
                    row && typeof row === "object" && "id" in row
                      ? String(row.id)
                      : `${kind}-${index + 1}`,
                  title:
                    row && typeof row === "object" && "name" in row
                      ? String(row.name)
                      : row && typeof row === "object" && "title" in row
                        ? String(row.title)
                        : kind,
                  subject: "",
                  date: "",
                  details: row,
                }))
              : rows && typeof rows === "object"
                ? [
                    {
                      type: `community ${kind}`,
                      id: user.id,
                      title: kind,
                      subject: "",
                      date: "",
                      details: rows,
                    },
                  ]
                : [],
          )
        : []),
    ];
    const columns = ["record_type", "id", "title", "subject", "date", "details"];
    const csv = [
      columns.join(","),
      ...records.map((record) =>
        columns.map((column) => csvCell(record[column as keyof typeof record])).join(","),
      ),
    ].join("\r\n");
    downloadFile("student-hub-study-data.csv", `\uFEFF${csv}`, "text/csv;charset=utf-8");
    if (communityExportError) toast.info(communityExportError);
    else toast.success("Your CSV export is ready.");
  };

  const confirmAccountDeletion = async () => {
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      toast.success("Your account and data have been deleted.");
      void navigate({ to: "/", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Account deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  const updateTimeZone = (value: string) => {
    setTimeZoneInput(value);
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      setTimeZoneError("");
      updateSettings({ time_zone: value });
    } catch {
      setTimeZoneError("Enter a valid IANA time zone, such as Europe/London.");
    }
  };

  return (
    <AppShell title={t("settings")} description="Personalize how Student Hub works for you.">
      <p className="mb-5 text-sm text-muted-foreground" role="status">
        {t("saveSettings")}
      </p>
      <div className="space-y-5">
        <section className="panel space-y-4 p-5" aria-labelledby="language-heading">
          <div>
            <h2 id="language-heading" className="text-lg font-semibold">
              {t("language")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("languageHelp")}</p>
          </div>
          <div className="max-w-md space-y-2">
            <Label htmlFor="language">{t("language")}</Label>
            <select
              id="language"
              className={selectClass}
              value={settings.language}
              onChange={(event) =>
                updateSettings({ language: event.target.value as SettingsRow["language"] })
              }
            >
              {LANGUAGES.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="panel space-y-4 p-5" aria-labelledby="academic-heading">
          <div>
            <h2 id="academic-heading" className="text-lg font-semibold">
              {t("countryAcademic")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("countryHelp")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="country">{t("country")}</Label>
              <select
                id="country"
                className={selectClass}
                value={settings.country}
                onChange={(event) => updateSettings({ country: event.target.value })}
              >
                {COUNTRIES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grading-system">{t("gradingSystem")}</Label>
              <select
                id="grading-system"
                className={selectClass}
                value={settings.grading_system}
                onChange={(event) =>
                  updateSettings({
                    grading_system: event.target.value as SettingsRow["grading_system"],
                  })
                }
              >
                {GRADING_SYSTEMS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="panel space-y-4 p-5" aria-labelledby="regional-heading">
          <div>
            <h2 id="regional-heading" className="text-lg font-semibold">
              {t("regional")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("timeZoneHelp")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="timezone">{t("timeZone")}</Label>
              <Input
                id="timezone"
                value={timeZoneInput}
                onChange={(event) => updateTimeZone(event.target.value)}
                aria-invalid={Boolean(timeZoneError)}
                aria-describedby={timeZoneError ? "timezone-error" : undefined}
              />
              {timeZoneError ? (
                <p id="timezone-error" role="alert" className="text-sm text-destructive">
                  {timeZoneError}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-format">{t("dateFormat")}</Label>
              <select
                id="date-format"
                className={selectClass}
                value={settings.date_format}
                onChange={(event) => updateSettings({ date_format: event.target.value })}
              >
                <option value="locale">Use language default</option>
                <option value="mdy">MM/DD/YYYY</option>
                <option value="dmy">DD/MM/YYYY</option>
                <option value="ymd">YYYY-MM-DD</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time-format">{t("timeFormat")}</Label>
              <select
                id="time-format"
                className={selectClass}
                value={settings.time_format}
                onChange={(event) =>
                  updateSettings({ time_format: event.target.value as SettingsRow["time_format"] })
                }
              >
                <option value="12h">12-hour</option>
                <option value="24h">24-hour</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="week-start">{t("weekStarts")}</Label>
              <select
                id="week-start"
                className={selectClass}
                value={settings.week_starts_on}
                onChange={(event) =>
                  updateSettings({
                    week_starts_on: Number(event.target.value) as SettingsRow["week_starts_on"],
                  })
                }
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>
          </div>
        </section>

        <section className="panel space-y-4 p-5" aria-labelledby="accessibility-heading">
          <h2 id="accessibility-heading" className="text-lg font-semibold">
            {t("accessibility")}
          </h2>
          <PreferenceToggle
            id="reduced-motion"
            label={t("reducedMotion")}
            checked={settings.reduced_motion}
            onChange={(value) => updateSettings({ reduced_motion: value })}
          />
          <PreferenceToggle
            id="high-contrast"
            label={t("highContrast")}
            checked={settings.high_contrast}
            onChange={(value) => updateSettings({ high_contrast: value })}
          />
        </section>

        <IntegrationsPanel user={user} />

        <section className="panel space-y-4 p-5" aria-labelledby="offline-heading">
          <div className="flex items-start gap-3">
            <Smartphone className="mt-1 size-5 text-accent-foreground" aria-hidden />
            <div>
              <h2 id="offline-heading" className="text-lg font-semibold">
                {t("offlinePwa")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("offlineHelp")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {canInstall ? <Button onClick={() => void install()}>{t("install")}</Button> : null}
            {installed ? (
              <p role="status" className="text-sm text-muted-foreground">
                Student Hub is installed on this device.
              </p>
            ) : null}
            {!canInstall && !installed ? (
              <p className="text-sm text-muted-foreground">
                Install option appears when your browser supports it.
              </p>
            ) : null}
          </div>
        </section>

        <section className="panel space-y-4 p-5" aria-labelledby="privacy-heading">
          <div>
            <h2 id="privacy-heading" className="text-lg font-semibold">
              {t("privacyData")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("privacyIntro")}</p>
          </div>
          <p className="text-sm text-muted-foreground">{t("exportHelp")}</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" onClick={exportJson}>
              <Download className="me-2 size-4" />
              {t("exportJson")}
            </Button>
            <Button type="button" variant="outline" onClick={exportCsv}>
              <Download className="me-2 size-4" />
              {t("exportCsv")}
            </Button>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h3 className="font-semibold text-destructive">{t("deleteAccount")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("deleteWarning")}</p>
            {!confirmDelete ? (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="me-2 size-4" />
                {t("deleteAccount")}
              </Button>
            ) : (
              <form
                className="mt-4 max-w-md space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  void confirmAccountDeletion();
                }}
              >
                <p className="text-sm">{t("deleteHelp")}</p>
                <div className="space-y-2">
                  <Label htmlFor="delete-password">{t("confirmPassword")}</Label>
                  <Input
                    id="delete-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={deletePassword}
                    onChange={(event) => setDeletePassword(event.target.value)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={deleting || !deletePassword}
                  >
                    {deleting ? "Deleting…" : t("deleteConfirm")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setConfirmDelete(false);
                      setDeletePassword("");
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

type IntegrationStatuses = Awaited<ReturnType<typeof getProviderStatus>>;
type CalendarEventType = "task" | "exam" | "study_session";

const INTEGRATIONS: {
  provider: IntegrationProvider;
  title: string;
  description: string;
  category: "lms" | "calendar";
}[] = [
  {
    provider: "google_classroom",
    title: "Google Classroom",
    description: "Import enrolled courses and coursework due dates.",
    category: "lms",
  },
  {
    provider: "canvas",
    title: "Canvas LMS",
    description: "Import courses and assignment due dates from an approved Canvas host.",
    category: "lms",
  },
  {
    provider: "moodle",
    title: "Moodle",
    description: "Import courses and assignments from an institution-configured Moodle instance.",
    category: "lms",
  },
  {
    provider: "google_calendar",
    title: "Google Calendar",
    description: "Sync selected planner items to your primary calendar.",
    category: "calendar",
  },
  {
    provider: "outlook_calendar",
    title: "Microsoft Outlook Calendar",
    description: "Sync selected planner items to your Outlook calendar.",
    category: "calendar",
  },
];

function IntegrationsPanel({ user }: { user: UserRow }) {
  const [statuses, setStatuses] = useState<IntegrationStatuses>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState<IntegrationProvider | "">("");
  const [instanceUrls, setInstanceUrls] = useState<Record<string, string>>({});
  const [eventTypes, setEventTypes] = useState<Record<string, CalendarEventType[]>>({});

  const refresh = async () => {
    try {
      const current = await getProviderStatus();
      setStatuses(current);
      setLoadError("");
      setInstanceUrls((previous) => ({
        ...previous,
        ...Object.fromEntries(
          current
            .filter((item) => item.instanceUrl)
            .map((item) => [item.provider, item.instanceUrl]),
        ),
      }));
      setEventTypes((previous) => {
        const next = { ...previous };
        for (const item of current) {
          if (item.provider !== "google_calendar" && item.provider !== "outlook_calendar") continue;
          if (next[item.provider]) continue;
          const prefs = item.preferences as { eventTypes?: unknown };
          next[item.provider] =
            Array.isArray(prefs.eventTypes) &&
            prefs.eventTypes.every((value) =>
              ["task", "exam", "study_session"].includes(String(value)),
            )
              ? (prefs.eventTypes as CalendarEventType[])
              : ["task", "exam"];
        }
        return next;
      });
    } catch (error) {
      console.error("Could not load provider integration status", error);
      setLoadError(
        error instanceof Error ? error.message : "Could not load provider integration status.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const connect = async (provider: IntegrationProvider) => {
    setWorking(provider);
    try {
      const instanceUrl =
        provider === "canvas" || provider === "moodle" ? instanceUrls[provider]?.trim() : undefined;
      const { authorizationUrl } = await beginProviderConnection({
        data: { provider, instanceUrl },
      });
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start provider connection.");
      setWorking("");
    }
  };

  const disconnect = async (provider: IntegrationProvider) => {
    if (
      !window.confirm("Disconnect this account? Student Hub will remove its saved access tokens.")
    ) {
      return;
    }
    setWorking(provider);
    try {
      await disconnectProvider({ data: { provider } });
      toast.success("Provider disconnected.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not disconnect provider.");
    } finally {
      setWorking("");
    }
  };

  const toggleEventType = (provider: IntegrationProvider, type: CalendarEventType) => {
    setEventTypes((current) => {
      const values = current[provider] ?? ["task", "exam"];
      return {
        ...current,
        [provider]: values.includes(type)
          ? values.filter((value) => value !== type)
          : [...values, type],
      };
    });
  };

  const saveAndSyncCalendar = async (provider: "google_calendar" | "outlook_calendar") => {
    setWorking(provider);
    try {
      await saveCalendarSyncPreferences({
        data: { provider, types: eventTypes[provider] ?? ["task", "exam"] },
      });
      const result = await syncCalendarEvents({ data: { provider } });
      toast.success(
        `Calendar sync complete: ${result.created} created, ${result.updated} updated, ${result.removed} removed.`,
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Calendar sync failed.");
      await refresh();
    } finally {
      setWorking("");
    }
  };

  const importContent = async (provider: "google_classroom" | "canvas" | "moodle") => {
    setWorking(provider);
    try {
      const result = await importLmsContent({ data: { provider } });
      await refreshUserData(user.id, user);
      toast.success(
        `Imported ${result.importedCourses} courses and ${result.importedTasks} assignments. ${result.alreadyPresent} existing items were left unchanged.`,
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "LMS import failed.");
      await refresh();
    } finally {
      setWorking("");
    }
  };

  const renderCard = (integration: (typeof INTEGRATIONS)[number]) => {
    const status = statuses.find((item) => item.provider === integration.provider);
    const busy = working === integration.provider;
    const instanceBased = integration.provider === "canvas" || integration.provider === "moodle";
    const instanceValue = instanceUrls[integration.provider] ?? "";
    const calendar =
      integration.provider === "google_calendar" || integration.provider === "outlook_calendar";
    const lms = integration.category === "lms";
    return (
      <article key={integration.provider} className="space-y-3 rounded-xl border border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold">{integration.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{integration.description}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Disconnect removes Student Hub credentials. To revoke the provider grant too, remove
              Student Hub from your account&apos;s connected apps.
            </p>
            <p className="mt-2 text-xs" role="status">
              {loading
                ? "Checking connection…"
                : status?.connected
                  ? `${status.configured ? "Connected" : "Connected · server configuration incomplete"}${status.lastSyncAt ? ` · Last sync ${new Date(status.lastSyncAt).toLocaleString()}` : ""}${status.lastSyncStatus === "error" ? " · Last sync failed" : ""}`
                  : status?.configured
                    ? "Not connected"
                    : status
                      ? "Not configured"
                      : "Status unavailable"}
            </p>
            {status?.lastSyncStatus === "error" && status.lastSyncError ? (
              <p className="mt-1 text-xs text-destructive">{status.lastSyncError}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            {status?.connected ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void disconnect(integration.provider)}
              >
                <Unplug className="me-2 size-4" /> Disconnect
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={
                  busy || loading || !status?.configured || (instanceBased && !instanceValue.trim())
                }
                onClick={() => void connect(integration.provider)}
              >
                Connect
              </Button>
            )}
          </div>
        </div>
        {instanceBased && !status?.connected ? (
          <div className="space-y-1">
            <Label htmlFor={`integration-${integration.provider}`}>Institution HTTPS URL</Label>
            <Input
              id={`integration-${integration.provider}`}
              type="url"
              placeholder="https://school.example.edu"
              value={instanceValue}
              onChange={(event) =>
                setInstanceUrls((current) => ({
                  ...current,
                  [integration.provider]: event.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              The host must also be explicitly allowlisted in the server configuration.
            </p>
          </div>
        ) : null}
        {status?.connected && lms ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() =>
              void importContent(integration.provider as "google_classroom" | "canvas" | "moodle")
            }
          >
            <RefreshCw className="me-2 size-4" /> Import courses and assignments
          </Button>
        ) : null}
        {status?.connected && calendar ? (
          <div className="space-y-3">
            <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
              <legend className="mb-2 text-sm font-medium">Event types to sync</legend>
              {(
                [
                  ["task", "Tasks / assignments"],
                  ["exam", "Exams"],
                  ["study_session", "Completed focus sessions"],
                ] as const
              ).map(([type, label]) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={(eventTypes[integration.provider] ?? ["task", "exam"]).includes(type)}
                    onCheckedChange={() => toggleEventType(integration.provider, type)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() =>
                void saveAndSyncCalendar(
                  integration.provider as "google_calendar" | "outlook_calendar",
                )
              }
            >
              <RefreshCw className="me-2 size-4" /> Save preferences and sync
            </Button>
            <p className="text-xs text-muted-foreground">
              Sync updates or removes only calendar events Student Hub previously created.
            </p>
          </div>
        ) : null}
      </article>
    );
  };

  return (
    <section className="panel space-y-5 p-5" aria-labelledby="integrations-heading">
      <div>
        <h2 id="integrations-heading" className="text-lg font-semibold">
          Calendar and LMS integrations
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Provider secrets and encrypted tokens stay on the server. Connections are optional and
          require administrator setup.
        </p>
      </div>
      {loadError ? (
        <p role="alert" className="text-sm text-destructive">
          {loadError} Apply the provider integrations migration and configure the server first.
        </p>
      ) : null}
      {loading && statuses.length === 0 ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading integration status…
        </p>
      ) : null}
      <div className="space-y-3">
        <h3 className="font-medium">Learning management systems</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {INTEGRATIONS.filter((item) => item.category === "lms").map(renderCard)}
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-medium">Calendars</h3>
        <div className="grid gap-3 lg:grid-cols-2">
          {INTEGRATIONS.filter((item) => item.category === "calendar").map(renderCard)}
        </div>
      </div>
    </section>
  );
}

function PreferenceToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
