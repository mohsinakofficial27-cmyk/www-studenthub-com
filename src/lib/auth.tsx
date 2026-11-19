import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";

import { getSupabaseConfigurationError, supabase } from "@/integrations/supabase/client";
import { permanentlyDeleteAccount } from "@/lib/account.functions";

import {
  loadUserData,
  mutate,
  read,
  refreshUserData,
  resetStore,
  startUserSession,
  subscribe,
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
  signUp: (input: { email: string; password: string }) => Promise<void>;
  signIn: (input: { email: string; password: string }) => Promise<void>;
  signOut: () => void;
  requestReset: (email: string) => Promise<string>;
  resetPassword: (input: { token: string; password: string }) => Promise<void>;
  changePassword: (input: { current: string; next: string }) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

const AVATAR_COLORS = ["#0e7c66", "#2563eb", "#b45309", "#7c3aed", "#be123c"];

function userRowFrom(supabaseUser: {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
}): UserRow {
  return {
    id: supabaseUser.id,
    name:
      (supabaseUser.user_metadata?.["name"] as string) ||
      supabaseUser.email?.split("@")[0] ||
      "Student",
    email: supabaseUser.email ?? "",
    password_hash: "",
    created_at: supabaseUser.created_at ?? new Date().toISOString(),
  };
}

/** Create the starter rows (profile, settings, welcome note). */
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
    if (!d.user_settings.some((s) => s.user_id === user.id)) {
      d.user_settings.push({
        user_id: user.id,
        notify_tasks: true,
        notify_exams: true,
        notify_streak: true,
        notify_billing: true,
        language: "en",
        country: "US",
        grading_system: "gpa4",
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        date_format: "locale",
        time_format: "12h",
        week_starts_on: 0,
        reduced_motion: false,
        high_contrast: false,
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
    if (getSupabaseConfigurationError()) return;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      const su = data.session?.user;
      if (su && read().session_user_id !== su.id) {
        const row = userRowFrom(su);
        startUserSession(row);
        try {
          await loadUserData(su.id, row);
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

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let lastRefresh = Date.now();
    const refreshWhenVisible = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < 30_000) {
        return;
      }
      lastRefresh = Date.now();
      const currentUser = read().users.find((row) => row.id === userId);
      if (currentUser) {
        void refreshUserData(userId, currentUser).catch((error: unknown) => {
          console.error("Could not refresh your data from another device", error);
          window.dispatchEvent(new Event("studenthub-sync-error"));
        });
      }
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [user?.id]);

  const signUp = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
    });
    if (error) throw new Error(error.message);
    if (!data.session || !data.user) {
      throw new Error(
        "Account created. Confirm your email before logging in. To enter the dashboard immediately after signup, disable email confirmation in your Supabase Auth settings.",
      );
    }
    const row = userRowFrom(data.user);
    startUserSession(row);
    void loadUserData(data.user.id, row)
      .catch((err: unknown) => {
        console.error("Could not load your data after signup", err);
      })
      .finally(() => seedStarterRows(row));
  }, []);

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const normalized = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error || !data.user) throw new Error("Email or password is incorrect.");
    const row = userRowFrom(data.user);
    startUserSession(row);
    void loadUserData(data.user.id, row).catch((err: unknown) => {
      console.error("Could not load your data after sign-in", err);
    });
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

  const changePassword = useCallback(
    async ({ current, next }: { current: string; next: string }) => {
      const email = read().users.find((u) => u.id === read().session_user_id)?.email;
      if (!email) throw new Error("You are not signed in.");
      const { error: checkError } = await supabase.auth.signInWithPassword({
        email,
        password: current,
      });
      if (checkError) throw new Error("Current password is incorrect.");
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) throw new Error(error.message);
    },
    [],
  );

  const deleteAccount = useCallback(async (password: string) => {
    await permanentlyDeleteAccount({ data: { password } });
    resetStore();
    void supabase.auth.signOut({ scope: "local" }).catch((error: unknown) => {
      console.error("Could not clear the local authentication session", error);
    });
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
