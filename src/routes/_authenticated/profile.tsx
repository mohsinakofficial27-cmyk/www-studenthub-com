import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { ErrorNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useDb } from "@/lib/auth";
import { mutate } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Student Hub" },
      { name: "description", content: "Update your details, subjects, password and notification settings." },
      { property: "og:title", content: "Profile — Student Hub" },
      { property: "og:description", content: "Manage your Student Hub account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const AVATAR_COLORS = ["#0e7c66", "#2563eb", "#b45309", "#7c3aed", "#be123c"];

function ProfilePage() {
  const { user, profile, changePassword, deleteAccount } = useAuth();
  const db = useDb();
  const navigate = useNavigate();
  const settings = db.user_settings.find((s) => s.user_id === user?.id);

  const [name, setName] = useState(profile?.name ?? "");
  const [grade, setGrade] = useState(profile?.grade ?? "");
  const [subjects, setSubjects] = useState((profile?.subjects ?? []).join(", "));
  const [goals, setGoals] = useState(profile?.goals ?? "");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwError, setPwError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!user) return null;

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    mutate((d) => {
      const p = d.profiles.find((x) => x.user_id === user.id);
      if (!p) return;
      p.name = name.trim() || p.name;
      p.grade = grade.trim();
      p.subjects = subjects
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      p.goals = goals.trim();
      const u = d.users.find((x) => x.id === user.id);
      if (u) u.name = p.name;
    });
    toast.success("Profile updated.");
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    if (next.length < 8) return setPwError("New password must be at least 8 characters.");
    try {
      await changePassword({ current, next });
      setCurrent("");
      setNext("");
      toast.success("Password changed.");
    } catch (err) {
      setPwError(err instanceof Error ? err.message : "Could not change your password.");
    }
  };

  const toggle = (key: "notify_tasks" | "notify_exams" | "notify_streak" | "notify_billing", value: boolean) =>
    mutate((d) => {
      const s = d.user_settings.find((x) => x.user_id === user.id);
      if (s) s[key] = value;
    });

  return (
    <AppShell title="Profile" description="Your details, security and notification preferences.">
      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={saveProfile} className="panel space-y-4 p-5">
          <div className="flex items-center gap-4">
            <span
              className="grid size-14 place-items-center rounded-full text-xl font-semibold text-brand-foreground"
              style={{ backgroundColor: profile?.avatar_color ?? AVATAR_COLORS[0] }}
            >
              {(profile?.name ?? user.name).slice(0, 1).toUpperCase()}
            </span>
            <div className="flex gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label="Choose avatar colour"
                  className="size-6 rounded-full border border-border"
                  style={{ backgroundColor: c }}
                  onClick={() =>
                    mutate((d) => {
                      const p = d.profiles.find((x) => x.user_id === user.id);
                      if (p) p.avatar_color = c;
                    })
                  }
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pname">Name</Label>
            <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pemail">Email</Label>
            <Input id="pemail" value={user.email} readOnly className="text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pgrade">Grade / year</Label>
            <Input id="pgrade" value={grade} onChange={(e) => setGrade(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="psubjects">Subjects</Label>
            <Input
              id="psubjects"
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              placeholder="Comma separated"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pgoals">Study goals</Label>
            <Textarea id="pgoals" rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} />
          </div>
          <Button type="submit" className="bg-brand text-brand-foreground hover:bg-brand/90">
            Save profile
          </Button>
        </form>

        <div className="space-y-4">
          <form onSubmit={savePassword} className="panel space-y-4 p-5">
            <h2 className="text-lg font-semibold">Change password</h2>
            {pwError ? <ErrorNote title="Could not update" description={pwError} /> : null}
            <div className="space-y-2">
              <Label htmlFor="cur">Current password</Label>
              <Input id="cur" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new">New password</Label>
              <Input id="new" type="password" value={next} onChange={(e) => setNext(e.target.value)} />
            </div>
            <Button type="submit" variant="outline">
              Update password
            </Button>
          </form>

          <div className="panel space-y-4 p-5">
            <h2 className="text-lg font-semibold">Notifications</h2>
            {(
              [
                ["notify_tasks", "Upcoming study tasks"],
                ["notify_exams", "Upcoming exams"],
                ["notify_streak", "Study streak reminders"],
                ["notify_billing", "Subscription and account"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <Label htmlFor={key} className="font-normal">
                  {label}
                </Label>
                <Switch id={key} checked={settings?.[key] ?? true} onCheckedChange={(v) => toggle(key, v)} />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="text-lg font-semibold text-destructive">Delete account</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This permanently removes your notes, quizzes, decks, planner and study history.
            </p>
            {confirmDelete ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteAccount();
                    toast.success("Your account has been deleted.");
                    void navigate({ to: "/", replace: true });
                  }}
                >
                  Yes, delete everything
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="outline" className="mt-4" onClick={() => setConfirmDelete(true)}>
                Delete my account
              </Button>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
