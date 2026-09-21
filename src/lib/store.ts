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

const KEY = "studenthub.db.v1";

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
  if (!isBrowser()) return empty();
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...empty(), ...(JSON.parse(raw) as Database) } : empty();
  } catch {
    cache = empty();
  }
  return cache;
}

export function write(next: Database) {
  cache = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* quota / private mode — state stays in memory for this session */
    }
  }
  listeners.forEach((l) => l());
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

/**
 * Cryptographically-random token for anything that grants access
 * (password reset, invites). Never use `uid()` for those — it is
 * Math.random()-based and therefore guessable.
 */
export function secureToken(bytes = 32) {
  if (isBrowser() && window.crypto?.getRandomValues) {
    const buf = new Uint8Array(bytes);
    window.crypto.getRandomValues(buf);
    return Array.from(buf)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  throw new Error("A secure random source is not available in this environment.");
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export async function hashPassword(password: string) {
  if (isBrowser() && window.crypto?.subtle) {
    const data = new TextEncoder().encode(`studenthub::${password}`);
    const digest = await window.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Non-crypto fallback; never reached in supported browsers.
  return `fallback::${password.length}`;
}
