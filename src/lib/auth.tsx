import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import {
  hashPassword,
  mutate,
  read,
  secureToken,
  subscribe,
  todayISO,
  uid,
  type Database,
  type ProfileRow,
  type UserRow,
} from "./store";

export function useDb(): Database {
  return useSyncExternalStore(
    (cb) => subscribe(cb),
    () => read(),
    () => read(),
  );
}

interface AuthValue {
  user: UserRow | null;
  profile: ProfileRow | null;
  loading: boolean;
  signUp: (input: { name: string; email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
  requestReset: (email: string) => Promise<string>;
  resetPassword: (input: { token: string; password: string }) => Promise<void>;
  changePassword: (input: { current: string; next: string }) => Promise<void>;
  deleteAccount: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const AVATAR_COLORS = ["#0e7c66", "#2563eb", "#b45309", "#7c3aed", "#be123c"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useDb();
  const hydrated = typeof window !== "undefined";

  const user = useMemo(
    () => db.users.find((u) => u.id === db.session_user_id) ?? null,
    [db.users, db.session_user_id],
  );
  const profile = useMemo(
    () => db.profiles.find((p) => p.user_id === db.session_user_id) ?? null,
    [db.profiles, db.session_user_id],
  );

  const signUp = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }) => {
    const normalized = email.trim().toLowerCase();
    if (read().users.some((u) => u.email === normalized)) {
      throw new Error("An account with that email already exists.");
    }
    const password_hash = await hashPassword(password);
    const id = uid();
    mutate((d) => {
      d.users.push({ id, name: name.trim(), email: normalized, password_hash, created_at: new Date().toISOString() });
      d.profiles.push({
        user_id: id,
        name: name.trim(),
        grade: "",
        subjects: [],
        goals: "",
        exams: "",
        daily_hours: 2,
        avatar_color: AVATAR_COLORS[d.users.length % AVATAR_COLORS.length]!,
        onboarded: false,
      });
      d.subscriptions.push({
        user_id: id,
        plan: "free",
        status: "active",
        mode: "test",
        started_at: todayISO(),
        renews_at: "",
        history: [],
      });
      d.user_settings.push({
        user_id: id,
        notify_tasks: true,
        notify_exams: true,
        notify_streak: true,
        notify_billing: true,
      });
      d.notifications.push({
        id: uid(),
        user_id: id,
        kind: "account",
        title: "Welcome to Student Hub",
        body: "Finish onboarding to personalise your dashboard.",
        created_at: new Date().toISOString(),
        read: false,
      });
      d.session_user_id = id;
    });
  }, []);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalized = email.trim().toLowerCase();
    const found = read().users.find((u) => u.email === normalized);
    const password_hash = await hashPassword(password);
    if (!found || found.password_hash !== password_hash) {
      throw new Error("Email or password is incorrect.");
    }
    mutate((d) => {
      d.session_user_id = found.id;
    });
  }, []);

  const signOut = useCallback(() => {
    mutate((d) => {
      d.session_user_id = null;
    });
  }, []);

  const requestReset = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    const found = read().users.find((u) => u.email === normalized);
    if (!found) throw new Error("No account found with that email.");
    // Without an email provider connected we surface the token in the UI
    // instead of sending a message. Swap this for a server-side email send.
    // The token must be unguessable: it is the only thing standing between an
    // attacker and this account, so it comes from a cryptographic random
    // source (never uid()/Math.random()).
    const token = secureToken();
    if (typeof window !== "undefined") window.sessionStorage.setItem(`reset.${token}`, found.id);
    return token;
  }, []);

  const resetPassword = useCallback(async ({ token, password }: { token: string; password: string }) => {
    const userId = typeof window !== "undefined" ? window.sessionStorage.getItem(`reset.${token}`) : null;
    if (!userId) throw new Error("This reset link is invalid or has expired.");
    const password_hash = await hashPassword(password);
    mutate((d) => {
      const u = d.users.find((x) => x.id === userId);
      if (u) u.password_hash = password_hash;
    });
    if (typeof window !== "undefined") window.sessionStorage.removeItem(`reset.${token}`);
  }, []);

  const changePassword = useCallback(async ({ current, next }: { current: string; next: string }) => {
    const db2 = read();
    const me = db2.users.find((u) => u.id === db2.session_user_id);
    if (!me) throw new Error("You are not signed in.");
    if (me.password_hash !== (await hashPassword(current))) throw new Error("Current password is incorrect.");
    const password_hash = await hashPassword(next);
    mutate((d) => {
      const u = d.users.find((x) => x.id === me.id);
      if (u) u.password_hash = password_hash;
    });
  }, []);

  const deleteAccount = useCallback(() => {
    const id = read().session_user_id;
    if (!id) return;
    mutate((d) => {
      d.users = d.users.filter((u) => u.id !== id);
      d.profiles = d.profiles.filter((r) => r.user_id !== id);
      d.subscriptions = d.subscriptions.filter((r) => r.user_id !== id);
      d.notes = d.notes.filter((r) => r.user_id !== id);
      d.quizzes = d.quizzes.filter((r) => r.user_id !== id);
      d.quiz_attempts = d.quiz_attempts.filter((r) => r.user_id !== id);
      d.flashcard_decks = d.flashcard_decks.filter((r) => r.user_id !== id);
      d.flashcards = d.flashcards.filter((r) => r.user_id !== id);
      d.study_tasks = d.study_tasks.filter((r) => r.user_id !== id);
      d.study_sessions = d.study_sessions.filter((r) => r.user_id !== id);
      d.ai_conversations = d.ai_conversations.filter((r) => r.user_id !== id);
      d.ai_messages = d.ai_messages.filter((r) => r.user_id !== id);
      d.user_settings = d.user_settings.filter((r) => r.user_id !== id);
      d.notifications = d.notifications.filter((r) => r.user_id !== id);
      d.session_user_id = null;
    });
  }, []);

  const value: AuthValue = {
    user,
    profile,
    loading: !hydrated,
    signUp,
    signIn,
    signOut,
    requestReset,
    resetPassword,
    changePassword,
    deleteAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
