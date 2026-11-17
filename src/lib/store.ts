/**
 * Student Hub local data layer.
 *
 * NOTE ON ARCHITECTURE
 * --------------------
 * The cloud backend is not connected yet, so all data is persisted in the
 * browser (localStorage) behind this single repository module. Every screen in
 * the app talks to this module only — never to localStorage directly.
 *
 * To move to a real backend later, re-implement the functions in this file
 * (and `auth.tsx`) against server functions. The table shapes below mirror the
 * intended database schema 1:1:
 *
 *   users, profiles, notes, quizzes, quiz_attempts,
 *   flashcard_decks, flashcards, study_tasks, study_sessions,
 *   ai_conversations, ai_messages, user_settings, notifications
 *
 * Every record carries `user_id`; all reads in this module are filtered by the
 * signed-in user id, mirroring row-level-security rules.
 * Legacy subscription rows remain in Supabase but are intentionally not loaded
 * or used for access decisions.
 */

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export interface ProfileRow {
  user_id: string;
  name: string;
  grade: string;
  subjects: string[];
  goals: string;
  exams: string;
  daily_hours: number;
  avatar_color: string;
  onboarded: boolean;
}

export interface NoteRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  subject: string;
  favorite: boolean;
  summary?: string;
  key_points?: string[];
  created_at: string;
  updated_at: string;
}

export interface QuizRow {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  created_at: string;
  questions: {
    id: string;
    prompt: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
}

export interface QuizAttemptRow {
  id: string;
  user_id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers: number[];
  taken_at: string;
  local_only?: boolean;
}

export interface DeckRow {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  created_at: string;
}

export interface CardRow {
  id: string;
  user_id: string;
  deck_id: string;
  front: string;
  back: string;
  confidence: "unrated" | "easy" | "medium" | "hard";
  due_date?: string;
  interval_days?: number;
  ease_factor?: number;
  repetitions?: number;
  review_count?: number;
  last_reviewed_at?: string | null;
}

export interface RubricCriterion {
  id: string;
  title: string;
  description: string;
  weight: number;
  score: number;
  notes: string;
}

export interface RubricRow {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  subject: string;
  criteria: RubricCriterion[];
  created_at: string;
  updated_at: string;
}

export interface ExamTopic {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  done: boolean;
  study_date?: string;
}

export interface ExamRoadmapRow {
  id: string;
  user_id: string;
  exam_title: string;
  subject: string;
  exam_date: string;
  daily_minutes: number;
  topics: ExamTopic[];
  created_at: string;
  updated_at: string;
}

export interface ResearchSourceRow {
  id: string;
  user_id: string;
  title: string;
  authors: string;
  published_at: string;
  url: string;
  notes: string;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type ApplicationStatus =
  "researching" | "preparing" | "submitted" | "accepted" | "rejected" | "waitlisted";

export interface ApplicationRow {
  id: string;
  user_id: string;
  kind: "university" | "scholarship";
  institution: string;
  program: string;
  deadline: string | null;
  status: ApplicationStatus;
  requirements: { id: string; title: string; done: boolean }[];
  notes: string;
  url: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetRow {
  id: string;
  user_id: string;
  category: string;
  amount: number;
  currency: string;
  date: string;
  description: string;
  created_at: string;
}

export interface BudgetProfileRow {
  user_id: string;
  currency: string;
  monthly_income: number;
  monthly_limit: number;
  savings_goal: number;
  updated_at: string;
}

export interface OfflineMarketNote {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  content: string;
  created_at: string;
}

export interface OfflineBounty {
  id: string;
  user_id: string;
  subject: string;
  question: string;
  reward: number;
  created_at: string;
  status: "open" | "answered" | "closed";
  accepted_answer_id: string | null;
}

export interface OfflineBountyAnswer {
  id: string;
  bounty_id: string;
  user_id: string;
  answer: string;
  created_at: string;
}

export interface OfflineMarketWallet {
  user_id: string;
  coins: number;
}

export interface CourseRow {
  id: string;
  user_id: string;
  name: string;
  instructor: string;
  credits: number;
  grade: string; // letter grade, e.g. "A-" — "" while ungraded
  target_grade: string;
  color: string;
  created_at: string;
}

export interface TaskRow {
  id: string;
  user_id: string;
  subject: string;
  topic: string;
  title: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:mm
  minutes: number;
  priority: "low" | "medium" | "high";
  done: boolean;
  is_exam: boolean;
}

export interface StudySessionRow {
  id: string;
  user_id: string;
  minutes: number;
  kind: "focus" | "break";
  ended_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  user_id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  mode: string;
  created_at: string;
}

export interface SettingsRow {
  user_id: string;
  notify_tasks: boolean;
  notify_exams: boolean;
  notify_streak: boolean;
  notify_billing: boolean;
  language: "en" | "ur" | "es" | "fr" | "de" | "ar";
  country: string;
  grading_system: "gpa4" | "gpa5" | "percentage" | "letter" | "uk";
  time_zone: string;
  date_format: string;
  time_format: "12h" | "24h";
  week_starts_on: 0 | 1 | 6;
  reduced_motion: boolean;
  high_contrast: boolean;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  kind: "task" | "exam" | "streak" | "billing" | "account";
  title: string;
  body: string;
  created_at: string;
  read: boolean;
}

export interface Database {
  users: UserRow[];
  profiles: ProfileRow[];
  courses: CourseRow[];
  notes: NoteRow[];
  quizzes: QuizRow[];
  quiz_attempts: QuizAttemptRow[];
  flashcard_decks: DeckRow[];
  flashcards: CardRow[];
  study_tasks: TaskRow[];
  study_sessions: StudySessionRow[];
  ai_conversations: ConversationRow[];
  ai_messages: MessageRow[];
  user_settings: SettingsRow[];
  notifications: NotificationRow[];
  assignment_rubrics: RubricRow[];
  exam_roadmaps: ExamRoadmapRow[];
  research_sources: ResearchSourceRow[];
  applications: ApplicationRow[];
  budget_profiles: BudgetProfileRow[];
  budget_entries: BudgetRow[];
  offline_market_notes: OfflineMarketNote[];
  offline_market_bounties: OfflineBounty[];
  offline_market_answers: OfflineBountyAnswer[];
  offline_market_wallets: OfflineMarketWallet[];
  session_user_id: string | null;
}

const empty = (): Database => ({
  users: [],
  profiles: [],
  courses: [],
  notes: [],
  quizzes: [],
  quiz_attempts: [],
  flashcard_decks: [],
  flashcards: [],
  study_tasks: [],
  study_sessions: [],
  ai_conversations: [],
  ai_messages: [],
  user_settings: [],
  notifications: [],
  assignment_rubrics: [],
  exam_roadmaps: [],
  research_sources: [],
  applications: [],
  budget_profiles: [],
  budget_entries: [],
  offline_market_notes: [],
  offline_market_bounties: [],
  offline_market_answers: [],
  offline_market_wallets: [],
  session_user_id: null,
});

function normalizeDatabase(value: Partial<Database>): Database {
  const defaults = empty();
  return {
    ...defaults,
    ...value,
    users: value.users ?? [],
    profiles: value.profiles ?? [],
    courses: value.courses ?? [],
    notes: value.notes ?? [],
    quizzes: value.quizzes ?? [],
    quiz_attempts: value.quiz_attempts ?? [],
    flashcard_decks: value.flashcard_decks ?? [],
    flashcards: value.flashcards ?? [],
    study_tasks: value.study_tasks ?? [],
    study_sessions: value.study_sessions ?? [],
    ai_conversations: value.ai_conversations ?? [],
    ai_messages: value.ai_messages ?? [],
    user_settings: value.user_settings ?? [],
    notifications: value.notifications ?? [],
    assignment_rubrics: value.assignment_rubrics ?? [],
    exam_roadmaps: value.exam_roadmaps ?? [],
    research_sources: value.research_sources ?? [],
    applications: value.applications ?? [],
    budget_profiles: value.budget_profiles ?? [],
    budget_entries: value.budget_entries ?? [],
    offline_market_notes: value.offline_market_notes ?? [],
    offline_market_bounties: value.offline_market_bounties ?? [],
    offline_market_answers: value.offline_market_answers ?? [],
    offline_market_wallets: value.offline_market_wallets ?? [],
    session_user_id: value.session_user_id ?? null,
  };
}

let cache: Database | null = null;
const listeners = new Set<() => void>();

function isBrowser() {
  return typeof window !== "undefined";
}

export function read(): Database {
  if (!cache) cache = empty();
  return cache;
}

export function write(next: Database) {
  cache = next;
  listeners.forEach((l) => l());
  void saveOfflineSnapshot(next).catch((error: unknown) => {
    console.error("Could not save offline data", error);
  });
  void scheduleSync();
}

export function mutate(fn: (db: Database) => void) {
  const next = structuredClone(read());
  fn(next);
  write(next);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function todayISO() {
  const now = new Date();
  return localDateKey(now);
}

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** SHA-256 hash — passwords are never stored or compared in plaintext. */
export async function hashPassword(password: string) {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Unguessable token from a cryptographic random source. */
export function secureToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------------------------------------------ *
 * Cloud sync
 *
 * Screens keep talking to this module synchronously. Every mutation is
 * diffed against the last synced snapshot and written through to the
 * cloud database, where row-level security scopes each row to its owner.
 * ------------------------------------------------------------------ */

type SyncSpec = { field: keyof Database; key: "id" | "user_id" };

// Tables the browser is allowed to write.
const SYNC_SPECS: SyncSpec[] = [
  { field: "profiles", key: "user_id" },
  { field: "user_settings", key: "user_id" },
  { field: "courses", key: "id" },
  { field: "notes", key: "id" },
  { field: "quizzes", key: "id" },
  { field: "flashcard_decks", key: "id" },
  { field: "flashcards", key: "id" },
  { field: "study_tasks", key: "id" },
  { field: "study_sessions", key: "id" },
  { field: "ai_conversations", key: "id" },
  { field: "ai_messages", key: "id" },
  { field: "notifications", key: "id" },
  { field: "assignment_rubrics", key: "id" },
  { field: "exam_roadmaps", key: "id" },
  { field: "research_sources", key: "id" },
  { field: "applications", key: "id" },
  { field: "budget_profiles", key: "user_id" },
  { field: "budget_entries", key: "id" },
];

function hasPendingChanges(database: Database, base: Database): boolean {
  return SYNC_SPECS.some(
    (spec) => canonicalJson(database[spec.field]) !== canonicalJson(base[spec.field]),
  );
}

// Quiz attempts are written server-side only; the database grades answers
// against the stored quiz (see src/lib/quiz.functions.ts).
const READ_ONLY_SPECS: SyncSpec[] = [{ field: "quiz_attempts", key: "id" }];

/** Tables read on load — sync specs plus the read-only rows. */
const READ_SPECS: SyncSpec[] = [...SYNC_SPECS, ...READ_ONLY_SPECS];
const KNOWN_TABLES = new Set<string>(READ_SPECS.map((spec) => spec.field));
const unavailableTables = new Set<string>();

function isMissingKnownTable(error: unknown, table: string) {
  if (!KNOWN_TABLES.has(table) || !error || typeof error !== "object") return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof message !== "string") return false;
  return (
    (code === "PGRST205" && message.includes(table)) ||
    (code === "42P01" && message.includes(table))
  );
}

let syncedSnapshot: Database | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let blockedByConflict = false;

const OFFLINE_DB_NAME = "student-hub-offline";
const OFFLINE_STORE_NAME = "snapshots";

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(OFFLINE_STORE_NAME, { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
}

async function saveOfflineSnapshot(next: Database) {
  if (!isBrowser() || !next.session_user_id || !("indexedDB" in window)) return;
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    transaction.objectStore(OFFLINE_STORE_NAME).put({
      userId: next.session_user_id,
      database: next,
      syncedDatabase: syncedSnapshot,
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not save offline data."));
  }).finally(() => db.close());
}

async function readOfflineSnapshot(
  userId: string,
): Promise<{ database: Database; syncedDatabase: Database | null } | null> {
  if (!isBrowser() || !("indexedDB" in window)) return null;
  const db = await openOfflineDb();
  return new Promise((resolve, reject) => {
    const request = db
      .transaction(OFFLINE_STORE_NAME, "readonly")
      .objectStore(OFFLINE_STORE_NAME)
      .get(userId);
    request.onsuccess = () => {
      db.close();
      const saved = request.result as
        { database?: Database; syncedDatabase?: Database | null } | undefined;
      if (saved?.database?.session_user_id !== userId) {
        resolve(null);
        return;
      }
      resolve({
        database: normalizeDatabase(saved.database),
        syncedDatabase: saved.syncedDatabase ? normalizeDatabase(saved.syncedDatabase) : null,
      });
    };
    request.onerror = () => {
      db.close();
      reject(request.error ?? new Error("Could not read offline data."));
    };
  });
}

async function deleteOfflineSnapshot(userId: string | null) {
  if (!isBrowser() || !userId || !("indexedDB" in window)) return;
  const db = await openOfflineDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(OFFLINE_STORE_NAME, "readwrite");
    transaction.objectStore(OFFLINE_STORE_NAME).delete(userId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error("Could not clear offline data."));
  }).finally(() => db.close());
}

/** Install rows loaded from the cloud without echoing them back up. */
export function hydrate(next: Database) {
  cache = next;
  syncedSnapshot = structuredClone(next);
  blockedByConflict = false;
  void saveOfflineSnapshot(next).catch((error: unknown) => {
    console.error("Could not save offline data", error);
  });
  listeners.forEach((l) => l());
}

/** Establish the authenticated identity before loading the user's cloud data. */
export function startUserSession(user: UserRow) {
  const next = empty();
  next.session_user_id = user.id;
  next.users = [user];
  cache = next;
  syncedSnapshot = structuredClone(next);
  blockedByConflict = false;
  listeners.forEach((listener) => listener());
}

/** Stop syncing (sign-out) and clear the in-memory cache. */
export function resetStore() {
  const userId = cache?.session_user_id ?? null;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
  unavailableTables.clear();
  syncedSnapshot = null;
  blockedByConflict = false;
  cache = empty();
  listeners.forEach((l) => l());
  void deleteOfflineSnapshot(userId).catch((error: unknown) => {
    console.error("Could not clear offline data", error);
  });
}

export function hasSyncConflict() {
  return blockedByConflict;
}

export async function discardPendingOfflineChanges() {
  await deleteOfflineSnapshot(read().session_user_id);
}

async function scheduleSync() {
  if (!isBrowser() || !syncedSnapshot) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void flushSync(), 250);
}

async function flushSync() {
  const prev = syncedSnapshot;
  const next = structuredClone(read());
  if (!prev || !next.session_user_id || syncing || blockedByConflict || !navigator.onLine) return;
  syncing = true;

  try {
    const { supabase } = await import("@/integrations/supabase/client");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;
    const changes = SYNC_SPECS.filter((spec) => !unavailableTables.has(spec.field)).map((spec) => {
      const rows = next[spec.field] as unknown as Record<string, unknown>[];
      const before = prev[spec.field] as unknown as Record<string, unknown>[];
      const beforeByKey = new Map(before.map((row) => [String(row[spec.key]), row]));
      return {
        spec,
        rows,
        before,
        beforeByKey,
        changed: rows.filter((row) => {
          const old = beforeByKey.get(String(row[spec.key]));
          return !old || canonicalJson(old) !== canonicalJson(row);
        }),
        removed: before
          .map((row) => String(row[spec.key]))
          .filter((key) => !rows.some((row) => String(row[spec.key]) === key)),
      };
    });

    for (const change of changes) {
      if (!change.changed.length && !change.removed.length) continue;
      const { data, error } = await db.from(change.spec.field).select("*");
      if (error) {
        if (isMissingKnownTable(error, change.spec.field)) {
          unavailableTables.add(change.spec.field);
          console.warn(
            `Table public.${change.spec.field} is unavailable; keeping changes in local storage.`,
          );
          continue;
        }
        throw new Error(`sync check ${change.spec.field}: ${error.message}`);
      }
      unavailableTables.delete(change.spec.field);
      const remoteByKey = new Map(
        ((data ?? []) as Record<string, unknown>[]).map((row) => [
          String(row[change.spec.key]),
          row,
        ]),
      );
      const conflicts =
        change.changed.some((row) => {
          const key = String(row[change.spec.key]);
          const base = change.beforeByKey.get(key);
          const remote = remoteByKey.get(key);
          return base
            ? Boolean(
                remote &&
                canonicalJson(base) !== canonicalJson(remote) &&
                canonicalJson(row) !== canonicalJson(remote),
              )
            : Boolean(remote && canonicalJson(row) !== canonicalJson(remote));
        }) ||
        change.removed.some((key) => {
          const base = change.beforeByKey.get(key);
          const remote = remoteByKey.get(key);
          return Boolean(remote && base && canonicalJson(base) !== canonicalJson(remote));
        });
      if (conflicts) {
        blockedByConflict = true;
        window.dispatchEvent(new Event("studenthub-sync-conflict"));
        return;
      }
    }

    for (const { spec, changed, removed } of changes) {
      if (unavailableTables.has(spec.field)) continue;
      if (changed.length) {
        const { error } = await db.from(spec.field).upsert(changed, { onConflict: spec.key });
        if (error) {
          if (isMissingKnownTable(error, spec.field)) {
            unavailableTables.add(spec.field);
            console.warn(
              `Table public.${spec.field} is unavailable; keeping changes in local storage.`,
            );
            continue;
          }
          throw new Error(`sync ${spec.field}: ${error.message}`);
        }
      }
      if (removed.length) {
        const { error } = await db.from(spec.field).delete().in(spec.key, removed);
        if (error) {
          if (isMissingKnownTable(error, spec.field)) {
            unavailableTables.add(spec.field);
            console.warn(
              `Table public.${spec.field} is unavailable; keeping changes in local storage.`,
            );
            continue;
          }
          throw new Error(`sync delete ${spec.field}: ${error.message}`);
        }
      }
    }

    const nextSynced = structuredClone(next);
    for (const table of unavailableTables) {
      const spec = SYNC_SPECS.find((item) => item.field === table);
      if (spec) {
        (nextSynced as unknown as Record<string, unknown>)[table] = structuredClone(
          prev[spec.field],
        );
      }
    }
    syncedSnapshot = nextSynced;
    if (JSON.stringify(read()) !== JSON.stringify(next)) void scheduleSync();
    void saveOfflineSnapshot(next).catch((error: unknown) => {
      console.error("Could not save offline data", error);
    });
  } catch (error) {
    console.error("Could not sync your offline changes", error);
    window.dispatchEvent(new Event("studenthub-sync-error"));
  } finally {
    syncing = false;
  }
}

/** Load every row the signed-in student owns into the in-memory cache. */
export async function loadUserData(
  userId: string,
  user: UserRow,
  preserveConcurrentChanges = false,
) {
  const startingCache = cache;
  const { supabase } = await import("@/integrations/supabase/client");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const next = empty();
  next.session_user_id = userId;
  next.users = [user];

  let savedOffline: Awaited<ReturnType<typeof readOfflineSnapshot>> = null;
  try {
    savedOffline = await readOfflineSnapshot(userId);
  } catch (error) {
    console.error("Could not check the offline data cache", error);
  }
  if (
    savedOffline?.syncedDatabase &&
    hasPendingChanges(savedOffline.database, savedOffline.syncedDatabase)
  ) {
    cache = savedOffline.database;
    syncedSnapshot = savedOffline.syncedDatabase;
    blockedByConflict = false;
    listeners.forEach((listener) => listener());
    if (navigator.onLine) void flushSync();
    return savedOffline.database;
  }

  unavailableTables.clear();
  if (savedOffline?.database.session_user_id === userId) {
    Object.assign(next, savedOffline.database);
    next.session_user_id = userId;
    next.users = [user];
  }

  try {
    await Promise.all(
      READ_SPECS.map(async (spec) => {
        const { data, error } = await db.from(spec.field).select("*");
        if (error) {
          if (isMissingKnownTable(error, spec.field)) {
            unavailableTables.add(spec.field);
            console.warn(
              `Table public.${spec.field} is unavailable; continuing with local data.`,
            );
            return;
          }
          throw new Error(error.message);
        }
        unavailableTables.delete(spec.field);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (next as any)[spec.field] = data ?? [];
      }),
    );
  } catch (error) {
    if (preserveConcurrentChanges && cache !== startingCache) {
      void scheduleSync();
      return read();
    }
    if (preserveConcurrentChanges) throw error;
    const offline = await readOfflineSnapshot(userId);
    if (!offline) throw error;
    cache = offline.database;
    syncedSnapshot = offline.syncedDatabase ?? structuredClone(offline.database);
    blockedByConflict = false;
    listeners.forEach((listener) => listener());
    return offline.database;
  }

  if (preserveConcurrentChanges && (cache !== startingCache || read().session_user_id !== userId)) {
    void scheduleSync();
    return read();
  }

  hydrate(next);
  return next;
}

/** Pull fresh rows when a signed-in tab returns, without replacing local edits. */
export async function refreshUserData(userId: string, user: UserRow) {
  if (
    !isBrowser() ||
    !navigator.onLine ||
    syncing ||
    blockedByConflict ||
    !syncedSnapshot ||
    read().session_user_id !== userId ||
    hasPendingChanges(read(), syncedSnapshot)
  ) {
    return;
  }
  await loadUserData(userId, user, true);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushSync());
}
