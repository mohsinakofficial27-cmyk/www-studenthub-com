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
 *   users, profiles, subscriptions, notes, quizzes, quiz_attempts,
 *   flashcard_decks, flashcards, study_tasks, study_sessions,
 *   ai_conversations, ai_messages, user_settings, notifications
 *
 * Every record carries `user_id`; all reads in this module are filtered by the
 * signed-in user id, mirroring row-level-security rules.
 */

export type PlanId = "free" | "student" | "pro";

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

export interface SubscriptionRow {
  user_id: string;
  plan: PlanId;
  status: "active" | "canceled" | "trialing";
  mode: "test" | "live";
  started_at: string;
  renews_at: string;
  history: { id: string; date: string; description: string; amount: number; status: string }[];
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
  subscriptions: SubscriptionRow[];
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
  session_user_id: string | null;
}

const empty = (): Database => ({
  users: [],
  profiles: [],
  subscriptions: [],
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
  session_user_id: null,
});

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
  return new Date().toISOString().slice(0, 10);
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

const SYNC_SPECS: SyncSpec[] = [
  { field: "profiles", key: "user_id" },
  { field: "subscriptions", key: "user_id" },
  { field: "user_settings", key: "user_id" },
  { field: "notes", key: "id" },
  { field: "quizzes", key: "id" },
  { field: "quiz_attempts", key: "id" },
  { field: "flashcard_decks", key: "id" },
  { field: "flashcards", key: "id" },
  { field: "study_tasks", key: "id" },
  { field: "study_sessions", key: "id" },
  { field: "ai_conversations", key: "id" },
  { field: "ai_messages", key: "id" },
  { field: "notifications", key: "id" },
];

let syncedSnapshot: Database | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;

/** Install rows loaded from the cloud without echoing them back up. */
export function hydrate(next: Database) {
  cache = next;
  syncedSnapshot = structuredClone(next);
  listeners.forEach((l) => l());
}

/** Stop syncing (sign-out) and clear the in-memory cache. */
export function resetStore() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = null;
  syncedSnapshot = null;
  cache = empty();
  listeners.forEach((l) => l());
}

async function scheduleSync() {
  if (!isBrowser() || !syncedSnapshot) return;
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void flushSync(), 250);
}

async function flushSync() {
  const prev = syncedSnapshot;
  const next = read();
  if (!prev || !next.session_user_id) return;
  const { supabase } = await import("@/integrations/supabase/client");

  for (const spec of SYNC_SPECS) {
    const rows = next[spec.field] as unknown as Record<string, unknown>[];
    const before = prev[spec.field] as unknown as Record<string, unknown>[];
    const beforeByKey = new Map(before.map((r) => [String(r[spec.key]), r]));
    const changed = rows.filter((r) => {
      const old = beforeByKey.get(String(r[spec.key]));
      return !old || JSON.stringify(old) !== JSON.stringify(r);
    });
    const removed = before
      .map((r) => String(r[spec.key]))
      .filter((k) => !rows.some((r) => String(r[spec.key]) === k));

    if (changed.length) {
      const { error } = await supabase.from(spec.field).upsert(changed, { onConflict: spec.key });
      if (error) console.error(`sync ${spec.field}`, error.message);
    }
    if (removed.length) {
      const { error } = await supabase.from(spec.field).delete().in(spec.key, removed);
      if (error) console.error(`sync delete ${spec.field}`, error.message);
    }
  }

  syncedSnapshot = structuredClone(read());
}

/** Load every row the signed-in student owns into the in-memory cache. */
export async function loadUserData(userId: string, user: UserRow) {
  const { supabase } = await import("@/integrations/supabase/client");
  const next = empty();
  next.session_user_id = userId;
  next.users = [user];

  await Promise.all(
    SYNC_SPECS.map(async (spec) => {
      const { data, error } = await supabase.from(spec.field).select("*");
      if (error) throw new Error(error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (next as any)[spec.field] = data ?? [];
    }),
  );

  hydrate(next);
  return next;
}

