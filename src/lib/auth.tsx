import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

import {
  loadUserData,
  mutate,
  read,
  resetStore,
  subscribe,
  todayISO,
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

function userRowFrom(supabaseUser: { id: string; email?: string; created_at?: string; user_metadata?: Record<string, unknown> }): UserRow {
  return {
    id: supabaseUser.id,
    name: (supabaseUser.user_metadata?.["name"] as string) || supabaseUser.email?.split("@")[0] || "Student",
    email: supabaseUser.email ?? "",
    password_hash: "",
    created_at: supabaseUser.created_at ?? new Date().toISOString(),
  };
}

/** Create the starter rows (profile, free subscription, settings, welcome note). */
function seedStarterRows(user: UserRow) {
  mutate((d) => {
    if (!d.profiles.some((p) => p.user_id === user.id)) {
      d.profiles.push({
        user_id: user.id,
        name: user.name,
        grade: "",
        subjects: [],
        goals: "",
        exams: "",
        daily_hours: 2,
        avatar_color: AVATAR_COLORS[0]!,
        onboarded: false,
      });
    }
    if (!d.subscriptions.some((s) => s.user_id === user.id)) {
      d.subscriptions.push({
        user_id: user.id,
        plan: "free",
        status: "active",
        mode: "test",
        started_at: todayISO(),
        renews_at: "",
        history: [],
      });
    }
    if (!d.user_settings.some((s) => s.user_id === user.id)) {
      d.user_settings.push({
        user_id: user.id,
        notify_tasks: true,
        notify_exams: true,
        notify_streak: true,
        notify_billing: true,
      });
    }
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const db = useDb();

  const user = useMemo(
    () => db.users.find((u) => u.id === db.session_user_id) ?? null,
    [db.users, db.session_user_id],
  );
  const profile = useMemo(
    () => db.profiles.find((p) => p.user_id === db.session_user_id) ?? null,
    [db.profiles, db.session_user_id],
  );

  // Restore the cloud session on page load and keep the local cache in sync.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const su = data.session?.user;
      if (su && read().session_user_id !== su.id) {
        try {
          await loadUserData(su.id, userRowFrom(su));
        } catch (err) {
          console.error("Could not load your data", err);
        }
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") resetStore();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: { data: { name: name.trim() } },
    });
    if (error) throw new Error(error.message);
    if (!data.session || !data.user) {
      throw new Error("Account created! Please check your email to confirm your account, then log in.");
    }
    const row = userRowFrom(data.user);
    row.name = name.trim();
    await loadUserData(data.user.id, row);
    seedStarterRows(row);
  }, []);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error || !data.user) throw new Error("Email or password is incorrect.");
    await loadUserData(data.user.id, userRowFrom(data.user));
  }, []);

  const signOut = useCallback(() => {
    void supabase.auth.signOut();
    resetStore();
  }, []);

  const requestReset = useCallback(async (email: string) => {
    const normalized = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
    return "";
  }, []);

  const resetPassword = useCallback(async ({ password }: { token: string; password: string }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }, []);

  const changePassword = useCallback(async ({ current, next }: { current: string; next: string }) => {
    const email = read().users.find((u) => u.id === read().session_user_id)?.email;
    if (!email) throw new Error("You are not signed in.");
    const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: current });
    if (checkError) throw new Error("Current password is incorrect.");
    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) throw new Error(error.message);
  }, []);

  const deleteAccount = useCallback(() => {
    void (async () => {
      const id = read().session_user_id;
      if (id) {
        // Remove every row the student owns; the auth account itself is
        // deactivated server-side.
        const tables = [
          "profiles",
          "notes",
          "quizzes",
          "quiz_attempts",
          "flashcard_decks",
          "flashcards",
          "study_tasks",
          "study_sessions",
          "ai_conversations",
          "ai_messages",
          "user_settings",
          "notifications",
        ];
        await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tables.map((t) => (supabase as any).from(t).delete().eq("user_id", id)),
        );
      }
      await supabase.auth.signOut();
      resetStore();
    })();
  }, []);

  const value: AuthValue = {
    user,
    profile,
    loading: false,
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
