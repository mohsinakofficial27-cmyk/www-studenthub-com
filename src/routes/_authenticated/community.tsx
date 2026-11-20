import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock, Link2, LockKeyhole, Plus, RefreshCw, Users, X } from "lucide-react";
import {
  cloneElement,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
} from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { InfoNote } from "@/components/empty-state";
import { useAuth, useDb } from "@/lib/auth";
import {
  getCommunitySnapshot,
  getLmsSetupStatus,
  getTutorListings,
  runCommunityAction,
  type CommunityAction,
} from "@/lib/community.functions";
import { refreshUserData } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/community")({
  head: () => ({
    meta: [
      { title: "Community — Student Hub" },
      {
        name: "description",
        content:
          "Study groups, collaborative sessions, peer tutoring, and permission-based progress sharing.",
      },
    ],
  }),
  component: CommunityPage,
});

const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  subject: z.string(),
  description: z.string(),
  created_at: z.string(),
  my_role: z.enum(["owner", "admin", "member"]),
});
const CommunitySchema = z.object({
  groups: z.array(GroupSchema),
  members: z.array(
    z.object({
      group_id: z.string(),
      user_id: z.string(),
      role: z.enum(["owner", "admin", "member"]),
      display_name: z.string(),
      joined_at: z.string(),
    }),
  ),
  sessions: z.array(
    z.object({
      id: z.string(),
      group_id: z.string(),
      title: z.string(),
      starts_at: z.string(),
      duration_minutes: z.number(),
      created_at: z.string(),
      attendees: z.array(z.string()),
    }),
  ),
  tutoring_profile: z
    .object({
      id: z.string(),
      display_name: z.string(),
      subjects: z.array(z.string()),
      bio: z.string(),
      format: z.enum(["online", "in_person", "either"]),
      active: z.boolean(),
      updated_at: z.string(),
    })
    .nullable(),
  tutoring_requests: z.array(
    z.object({
      id: z.string(),
      direction: z.enum(["sent", "received"]),
      other_name: z.string(),
      message: z.string(),
      status: z.enum(["pending", "accepted", "declined", "cancelled"]),
      created_at: z.string(),
    }),
  ),
  progress_shares: z.array(
    z.object({
      id: z.string(),
      side: z.enum(["owner", "recipient"]),
      display_name: z.string(),
      scopes: z.record(z.string(), z.unknown()),
      accepted_at: z.string(),
      revoked_at: z.string().nullable(),
    }),
  ),
  progress_invitations: z.array(
    z.object({
      id: z.string(),
      recipient_email: z.string(),
      scopes: z.record(z.string(), z.unknown()),
      expires_at: z.string(),
      revoked_at: z.string().nullable(),
    }),
  ),
  group_invitations: z.array(
    z.object({
      id: z.string(),
      group_id: z.string(),
      expires_at: z.string(),
      revoked_at: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
  shared_resources: z.array(
    z.object({
      id: z.string(),
      group_id: z.string(),
      resource_type: z.enum(["note", "flashcard_deck"]),
      title: z.string(),
      permission: z.enum(["view", "edit"]),
      snapshot: z.record(z.string(), z.unknown()),
      owner_name: z.string(),
      is_owner: z.boolean(),
      created_at: z.string(),
      revoked_at: z.string().nullable(),
    }),
  ),
});

type CommunityData = z.infer<typeof CommunitySchema>;
type LocalCommunityPost = { id: string; author: string; content: string; createdAt: string };
type Tutor = {
  listing_id: string;
  display_name: string;
  subjects: string[];
  bio: string;
  format: string;
};
type ProgressOverview = {
  display_name: string;
  courses: number;
  tasks_completed: number;
  study_minutes: number;
  recent_quiz_average: number | null;
};
type LMSStatus = Awaited<ReturnType<typeof getLmsSetupStatus>>;

function CommunityPage() {
  const { user } = useAuth();
  const db = useDb();
  const [data, setData] = useState<CommunityData | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [lms, setLms] = useState<LMSStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [working, setWorking] = useState(false);
  const [progressView, setProgressView] = useState<ProgressOverview | null>(null);
  const [newGroupToken, setNewGroupToken] = useState("");
  const [newProgressToken, setNewProgressToken] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [localFallback, setLocalFallback] = useState(false);
  const [localPostInput, setLocalPostInput] = useState("");
  const [localPosts, setLocalPosts] = useState<LocalCommunityPost[]>([
    {
      id: "sample-1",
      author: "Student Hub sample",
      content:
        "What topic are you focusing on today? Share a goal and break it into one small step.",
      createdAt: new Date().toISOString(),
    },
    {
      id: "sample-2",
      author: "Student Hub sample",
      content:
        "Study tip: try a 25-minute focus block, then write down one thing you learned from memory.",
      createdAt: new Date().toISOString(),
    },
  ]);

  const load = async () => {
    try {
      const [snapshotResult, tutorResult, statusResult] = await Promise.allSettled([
        getCommunitySnapshot(),
        getTutorListings(),
        getLmsSetupStatus(),
      ]);
      if (snapshotResult.status === "rejected") {
        const error = snapshotResult.reason;
        const message = error instanceof Error ? error.message : String(error);
        if (
          /community database migration|community data.*migration|PGRST202|PGRST205|42P01|42883/i.test(
            message,
          )
        ) {
          setData({
            groups: [],
            members: [],
            sessions: [],
            tutoring_profile: null,
            tutoring_requests: [],
            progress_shares: [],
            progress_invitations: [],
            group_invitations: [],
            shared_resources: [],
          });
          setTutors([]);
          setLms(statusResult.status === "fulfilled" ? statusResult.value : null);
          setLocalFallback(true);
          setLoadError("");
          return;
        }
        throw error;
      }

      setData(CommunitySchema.parse(snapshotResult.value));
      setLms(statusResult.status === "fulfilled" ? statusResult.value : null);
      if (statusResult.status === "rejected") {
        console.warn("Could not load community integration setup status", statusResult.reason);
      }
      setLoadError("");
      setLocalFallback(false);
      if (tutorResult.status === "fulfilled" && Array.isArray(tutorResult.value)) {
        setTutors(
          z
            .array(
              z.object({
                listing_id: z.string(),
                display_name: z.string(),
                subjects: z.array(z.string()),
                bio: z.string(),
                format: z.string(),
              }),
            )
            .parse(tutorResult.value),
        );
      } else {
        setTutors([]);
        if (tutorResult.status === "rejected") {
          console.warn("Could not load opt-in tutor listings", tutorResult.reason);
        }
      }
    } catch (error) {
      console.error("Could not load community data", error);
      const message = error instanceof Error ? error.message : "Could not load community data.";
      setLoadError(message);
      setData(null);
      setTutors([]);
      setLocalFallback(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const run = async (input: CommunityAction) => {
    if (localFallback) {
      toast.info(
        "Community database setup is needed to save this change. Your local feed still works.",
      );
      return null;
    }
    setWorking(true);
    try {
      const result = await runCommunityAction({ data: input });
      await load();
      if (result === false)
        toast.error("No change was made; check that the record is still available.");
      return result;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Community action failed.");
      return null;
    } finally {
      setWorking(false);
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied. Share it only with the intended recipient.`);
    } catch {
      toast.error("Clipboard access failed. Select and copy the token manually.");
    }
  };

  const showProgress = async (shareId: string) => {
    const result = await run({ action: "get-progress", shareId });
    const parsed = z
      .object({
        display_name: z.string(),
        courses: z.number(),
        tasks_completed: z.number(),
        study_minutes: z.number(),
        recent_quiz_average: z.number().nullable(),
      })
      .safeParse(result);
    if (!parsed.success) {
      toast.error("Progress could not be displayed.");
      return;
    }
    setProgressView(parsed.data);
  };

  const shareables = useMemo(
    () => ({
      notes: db.notes.filter((row) => row.user_id === user?.id),
      decks: db.flashcard_decks.filter((row) => row.user_id === user?.id),
    }),
    [db.notes, db.flashcard_decks, user?.id],
  );

  if (!user) return null;

  return (
    <AppShell
      title="Student Community"
      description="Collaborate with clear ownership, consent, and revocable access."
    >
      {loading ? (
        <p className="panel p-5 text-sm text-muted-foreground" role="status">
          Loading your community…
        </p>
      ) : null}
      {!loading && !data ? (
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Could not load community features</h2>
          <p className="text-sm text-muted-foreground">
            {loadError ||
              "Check your connection and database setup, then retry. Existing Student Hub data remains separate."}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            <RefreshCw className="me-2 size-4" /> Retry
          </Button>
        </section>
      ) : null}
      {localFallback ? (
        <section className="mb-4 space-y-4">
          <InfoNote
            title="Local community preview"
            description="Community storage is not configured in Supabase yet. You can try this sample feed in your browser; posts here are temporary and are not shared or saved."
          />
          <div className="panel space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">Study feed · local preview</h2>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground">
                Not shared
              </span>
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                const content = localPostInput.trim();
                if (!content) return;
                setLocalPosts((posts) => [
                  {
                    id: crypto.randomUUID(),
                    author: user.name || "You",
                    content,
                    createdAt: new Date().toISOString(),
                  },
                  ...posts,
                ]);
                setLocalPostInput("");
              }}
            >
              <Textarea
                value={localPostInput}
                onChange={(event) => setLocalPostInput(event.target.value.slice(0, 500))}
                placeholder="Write a study goal or note…"
                maxLength={500}
                rows={2}
                aria-label="Write a local community post"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!localPostInput.trim()}
                className="bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Plus className="size-4" /> Add to this preview
              </Button>
            </form>
            <div className="space-y-3">
              {localPosts.map((post) => (
                <article key={post.id} className="rounded-xl border border-border p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{post.author}</p>
                    <time className="text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {post.content}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}
      {data && !localFallback ? (
        <Tabs defaultValue="groups">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="groups">Study groups</TabsTrigger>
            <TabsTrigger value="tutors">Peer tutoring</TabsTrigger>
            <TabsTrigger value="sharing">Sharing</TabsTrigger>
            <TabsTrigger value="lms">LMS integrations</TabsTrigger>
          </TabsList>
          <TabsContent value="groups">
            <GroupsPanel
              userId={user.id}
              data={data}
              busy={working}
              token={newGroupToken}
              onRun={run}
              onToken={setNewGroupToken}
              onCopy={copy}
            />
          </TabsContent>
          <TabsContent value="tutors">
            <TutoringPanel data={data} tutors={tutors} busy={working} onRun={run} />
          </TabsContent>
          <TabsContent value="sharing">
            <SharingPanel
              data={data}
              shareables={shareables}
              busy={working}
              token={newProgressToken}
              onToken={setNewProgressToken}
              onRun={run}
              onCopy={copy}
              progressView={progressView}
              onShowProgress={showProgress}
              editingId={editingId}
              editingValue={editingValue}
              onEdit={(id, value) => {
                setEditingId(id);
                setEditingValue(value);
              }}
              onEditValue={setEditingValue}
              onCancelEdit={() => {
                setEditingId(null);
                setEditingValue("");
              }}
              onRefreshUserData={() => void refreshUserData(user.id, user)}
            />
          </TabsContent>
          <TabsContent value="lms">
            <LmsPanel status={lms} />
          </TabsContent>
        </Tabs>
      ) : null}
    </AppShell>
  );
}

function GroupsPanel({
  userId,
  data,
  busy,
  token,
  onRun,
  onToken,
  onCopy,
}: {
  userId: string;
  data: CommunityData;
  busy: boolean;
  token: string;
  onRun: (input: CommunityAction) => Promise<unknown>;
  onToken: (token: string) => void;
  onCopy: (value: string, label: string) => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [groupId, setGroupId] = useState("");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionDuration, setSessionDuration] = useState("45");
  const selectedGroup = data.groups.find((group) => group.id === groupId) ?? data.groups[0];
  const members = data.members.filter((member) => member.group_id === selectedGroup?.id);
  const invitations = data.group_invitations.filter(
    (invite) => invite.group_id === selectedGroup?.id,
  );
  const sessions = data.sessions.filter((session) => session.group_id === selectedGroup?.id);

  const createGroup = async (event: FormEvent) => {
    event.preventDefault();
    const result = await onRun({ action: "create-group", name, subject, description });
    if (result) {
      setName("");
      setSubject("");
      setDescription("");
      toast.success("Study group created.");
    }
  };
  const createSession = async (event: FormEvent) => {
    event.preventDefault();
    const date = new Date(sessionDate);
    if (!selectedGroup || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      toast.error("Choose a valid future date and time.");
      return;
    }
    const result = await onRun({
      action: "create-session",
      groupId: selectedGroup.id,
      title: sessionTitle,
      startsAt: date.toISOString(),
      durationMinutes: Number(sessionDuration),
    });
    if (result) {
      setSessionTitle("");
      setSessionDate("");
      toast.success("Group study session scheduled.");
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_1.2fr]">
      <div className="space-y-4">
        <form className="panel space-y-3 p-5" onSubmit={(event) => void createGroup(event)}>
          <h2 className="text-lg font-semibold">Create a study group</h2>
          <Field label="Group name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              maxLength={80}
              required
            />
          </Field>
          <Field label="Subject">
            <Input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={120}
            />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={1000}
              rows={3}
            />
          </Field>
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
          >
            <Plus className="me-2 size-4" /> Create group
          </Button>
        </form>

        <form
          className="panel space-y-3 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await onRun({ action: "accept-group", token: joinToken.trim() });
            if (result) {
              setJoinToken("");
              toast.success("You joined the study group.");
            }
          }}
        >
          <h2 className="font-semibold">Join with invitation token</h2>
          <Input
            aria-label="Group invitation token"
            value={joinToken}
            onChange={(event) => setJoinToken(event.target.value)}
            placeholder="Paste the 64-character token"
            minLength={64}
            maxLength={64}
            required
          />
          <Button variant="outline" type="submit" disabled={busy}>
            Join group
          </Button>
        </form>
        {token ? (
          <div className="panel space-y-2 p-4">
            <p className="text-sm font-medium">New invitation token (shown only once)</p>
            <code className="block break-all text-xs">{token}</code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopy(token, "Group invitation token")}
            >
              Copy token
            </Button>
          </div>
        ) : null}

        {data.groups.length ? (
          <section className="panel space-y-3 p-5">
            <h2 className="font-semibold">Your groups</h2>
            {data.groups.map((group) => (
              <button
                type="button"
                key={group.id}
                onClick={() => setGroupId(group.id)}
                className={`w-full rounded-xl border p-3 text-left ${selectedGroup?.id === group.id ? "border-brand bg-brand-soft/40" : "border-border"}`}
              >
                <span className="block font-medium">{group.name}</span>
                <span className="text-xs text-muted-foreground">
                  {group.subject || "General"} · {group.my_role}
                </span>
              </button>
            ))}
          </section>
        ) : null}
      </div>

      <div className="space-y-4">
        {!selectedGroup ? (
          <EmptyPanel
            icon={Users}
            text="Create a group or join one to schedule sessions and share study material."
          />
        ) : (
          <>
            <section className="panel space-y-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selectedGroup.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedGroup.description || selectedGroup.subject || "Study group"} ·{" "}
                    {members.length} members
                  </p>
                </div>
                {selectedGroup.my_role === "owner" || selectedGroup.my_role === "admin" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      const result = await onRun({
                        action: "invite-group",
                        groupId: selectedGroup.id,
                        expiresHours: 72,
                      });
                      if (typeof result === "string") {
                        onToken(result);
                        toast.success("Invitation created; it expires in 72 hours.");
                      }
                    }}
                  >
                    <Link2 className="me-2 size-4" /> Invite members
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onRun({ action: "leave-group", groupId: selectedGroup.id })}
                  >
                    Leave group
                  </Button>
                )}
              </div>
              <ul className="divide-y divide-border">
                {members.map((member) => (
                  <li key={member.user_id} className="flex items-center gap-2 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{member.display_name}</span>
                    <span className="text-xs capitalize text-muted-foreground">{member.role}</span>
                    {selectedGroup.my_role === "owner" && member.role !== "owner" ? (
                      <select
                        aria-label={`Role for ${member.display_name}`}
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                        value={member.role}
                        onChange={(event) =>
                          void onRun({
                            action: "set-member-role",
                            groupId: selectedGroup.id,
                            memberId: member.user_id,
                            role: event.target.value as "admin" | "member",
                          })
                        }
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : null}
                    {(selectedGroup.my_role === "owner" || selectedGroup.my_role === "admin") &&
                    member.role !== "owner" &&
                    !(selectedGroup.my_role === "admin" && member.role === "admin") ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Remove ${member.display_name}`}
                        onClick={() =>
                          void onRun({
                            action: "remove-member",
                            groupId: selectedGroup.id,
                            memberId: member.user_id,
                          })
                        }
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
              {(selectedGroup.my_role === "owner" || selectedGroup.my_role === "admin") &&
              invitations.length ? (
                <div className="space-y-1 border-t border-border pt-3">
                  <p className="text-xs font-medium text-muted-foreground">Invitations</p>
                  {invitations.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span>
                        {invite.revoked_at
                          ? "Revoked"
                          : `Expires ${new Date(invite.expires_at).toLocaleString()}`}
                      </span>
                      {!invite.revoked_at ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void onRun({
                              action: "revoke-group-invitation",
                              invitationId: invite.id,
                            })
                          }
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              {selectedGroup.my_role === "owner" ? (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Delete this group, its sessions, and active shared links?"))
                      void onRun({ action: "delete-group", groupId: selectedGroup.id });
                  }}
                >
                  Delete group
                </Button>
              ) : null}
            </section>

            <form
              className="panel grid gap-3 p-5 sm:grid-cols-2"
              onSubmit={(event) => void createSession(event)}
            >
              <div className="sm:col-span-2">
                <h3 className="font-semibold">Schedule a group study session</h3>
                <p className="text-xs text-muted-foreground">
                  Only current group members can see or join sessions.
                </p>
              </div>
              <Field label="Session title">
                <Input
                  value={sessionTitle}
                  onChange={(event) => setSessionTitle(event.target.value)}
                  minLength={2}
                  maxLength={120}
                  required
                />
              </Field>
              <Field label="Start date and time">
                <Input
                  type="datetime-local"
                  value={sessionDate}
                  onChange={(event) => setSessionDate(event.target.value)}
                  required
                />
              </Field>
              <Field label="Duration in minutes">
                <Input
                  type="number"
                  min={10}
                  max={600}
                  step={5}
                  value={sessionDuration}
                  onChange={(event) => setSessionDuration(event.target.value)}
                  required
                />
              </Field>
              <div className="flex items-end">
                <Button type="submit" disabled={busy}>
                  Create session
                </Button>
              </div>
            </form>

            <section className="panel space-y-3 p-5">
              <h3 className="font-semibold">Upcoming group sessions</h3>
              {sessions.filter(
                (session) =>
                  Date.parse(session.starts_at) + session.duration_minutes * 60_000 > Date.now(),
              ).length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming sessions.</p>
              ) : null}
              {sessions
                .filter(
                  (session) =>
                    Date.parse(session.starts_at) + session.duration_minutes * 60_000 > Date.now(),
                )
                .map((session) => {
                  const attending = session.attendees.includes(userId);
                  return (
                    <div
                      key={session.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{session.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(session.starts_at).toLocaleString()} ·{" "}
                          {session.duration_minutes} min · {session.attendees.length} attending
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={attending ? "outline" : "default"}
                        disabled={busy}
                        onClick={() =>
                          void onRun({
                            action: attending ? "leave-session" : "join-session",
                            sessionId: session.id,
                          })
                        }
                      >
                        {attending ? "Leave" : "Join"}
                      </Button>
                    </div>
                  );
                })}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function TutoringPanel({
  data,
  tutors,
  busy,
  onRun,
}: {
  data: CommunityData;
  tutors: Tutor[];
  busy: boolean;
  onRun: (input: CommunityAction) => Promise<unknown>;
}) {
  const profile = data.tutoring_profile;
  const [name, setName] = useState(profile?.display_name ?? "");
  const [subjects, setSubjects] = useState(profile?.subjects.join(", ") ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [format, setFormat] = useState<"online" | "in_person" | "either">(
    profile?.format ?? "online",
  );
  const [active, setActive] = useState(profile?.active ?? false);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(profile?.display_name ?? "");
    setSubjects(profile?.subjects.join(", ") ?? "");
    setBio(profile?.bio ?? "");
    setFormat(profile?.format ?? "online");
    setActive(profile?.active ?? false);
  }, [profile]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <form
          className="panel space-y-4 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await onRun({
              action: "save-tutor-profile",
              displayName: name,
              subjects: subjects
                .split(",")
                .map((subject) => subject.trim())
                .filter(Boolean),
              bio,
              format,
              active,
            });
            if (result)
              toast.success(
                active ? "Your tutoring listing is active." : "Your tutor profile was saved.",
              );
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Peer tutor profile</h2>
            <p className="text-sm text-muted-foreground">
              Your listing is opt-in. Contact details are not public; tutoring requests are visible
              only to you and the requesting student.
            </p>
          </div>
          <Field label="Display name">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              required
            />
          </Field>
          <Field label="Subjects (comma separated)">
            <Input
              value={subjects}
              onChange={(event) => setSubjects(event.target.value)}
              placeholder="Biology, Algebra"
            />
          </Field>
          <Field label="About your tutoring">
            <Textarea
              rows={4}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              maxLength={1000}
            />
          </Field>
          <Field label="Format">
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
            >
              <option value="online">Online</option>
              <option value="in_person">In person</option>
              <option value="either">Either</option>
            </select>
          </Field>
          <div className="flex items-center gap-3">
            <Checkbox
              id="tutor-active"
              checked={active}
              onCheckedChange={(checked) => setActive(Boolean(checked))}
            />
            <Label htmlFor="tutor-active">Show my listing to signed-in students</Label>
          </div>
          <Button type="submit" disabled={busy}>
            Save tutor profile
          </Button>
        </form>
        <section className="panel space-y-3 p-5">
          <h2 className="font-semibold">Tutoring requests</h2>
          {data.tutoring_requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tutoring requests yet.</p>
          ) : null}
          {data.tutoring_requests.map((request) => (
            <div key={request.id} className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-medium">
                  {request.direction === "received"
                    ? `From ${request.other_name}`
                    : `To ${request.other_name}`}
                </p>
                <span className="text-xs capitalize text-muted-foreground">{request.status}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{request.message}</p>
              {request.direction === "received" && request.status === "pending" ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      void onRun({
                        action: "respond-tutoring",
                        requestId: request.id,
                        accept: true,
                      })
                    }
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() =>
                      void onRun({
                        action: "respond-tutoring",
                        requestId: request.id,
                        accept: false,
                      })
                    }
                  >
                    Decline
                  </Button>
                </div>
              ) : null}
            </div>
          ))}
        </section>
      </div>
      <section className="panel space-y-3 p-5">
        <div>
          <h2 className="text-lg font-semibold">Find a peer tutor</h2>
          <p className="text-sm text-muted-foreground">
            Only opt-in listings are shown. Tutor account IDs and email addresses are not returned.
          </p>
        </div>
        {tutors.length === 0 ? (
          <p className="py-5 text-center text-sm text-muted-foreground">
            No active tutor listings yet.
          </p>
        ) : null}
        {tutors.map((tutor) => (
          <article key={tutor.listing_id} className="space-y-3 rounded-xl border border-border p-4">
            <div>
              <h3 className="font-semibold">{tutor.display_name}</h3>
              <p className="text-xs text-muted-foreground">
                {tutor.subjects.join(" · ") || "Subjects not specified"} ·{" "}
                {tutor.format.replace("_", " ")}
              </p>
            </div>
            {tutor.bio ? (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{tutor.bio}</p>
            ) : null}
            <Textarea
              aria-label={`Message to ${tutor.display_name}`}
              placeholder="What subject or topic do you need help with?"
              rows={2}
              value={messages[tutor.listing_id] ?? ""}
              onChange={(event) =>
                setMessages((current) => ({ ...current, [tutor.listing_id]: event.target.value }))
              }
            />
            <Button
              size="sm"
              disabled={busy || !messages[tutor.listing_id]?.trim()}
              onClick={async () => {
                const result = await onRun({
                  action: "request-tutor",
                  listingId: tutor.listing_id,
                  message: messages[tutor.listing_id] ?? "",
                });
                if (result) {
                  setMessages((current) => ({ ...current, [tutor.listing_id]: "" }));
                  toast.success("Tutoring request sent.");
                }
              }}
            >
              Request tutoring
            </Button>
          </article>
        ))}
      </section>
    </div>
  );
}

function SharingPanel({
  data,
  shareables,
  busy,
  token,
  onToken,
  onRun,
  onCopy,
  progressView,
  onShowProgress,
  editingId,
  editingValue,
  onEdit,
  onEditValue,
  onCancelEdit,
  onRefreshUserData,
}: {
  data: CommunityData;
  shareables: {
    notes: { id: string; title: string; content: string; subject: string }[];
    decks: { id: string; name: string; subject: string }[];
  };
  busy: boolean;
  token: string;
  onToken: (token: string) => void;
  onRun: (input: CommunityAction) => Promise<unknown>;
  onCopy: (value: string, label: string) => void;
  progressView: ProgressOverview | null;
  onShowProgress: (id: string) => void;
  editingId: string | null;
  editingValue: string;
  onEdit: (id: string, value: string) => void;
  onEditValue: (value: string) => void;
  onCancelEdit: () => void;
  onRefreshUserData: () => void;
}) {
  const [email, setEmail] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [resourceType, setResourceType] = useState<"note" | "flashcard_deck">("note");
  const [resourceId, setResourceId] = useState("");
  const [permission, setPermission] = useState<"view" | "edit">("view");
  const [progressId, setProgressId] = useState("");
  const targets = resourceType === "note" ? shareables.notes : shareables.decks;

  useEffect(() => {
    if (!selectedGroup && data.groups[0]) setSelectedGroup(data.groups[0].id);
  }, [data.groups, selectedGroup]);
  useEffect(() => {
    if (!targets.some((row) => row.id === resourceId)) setResourceId(targets[0]?.id ?? "");
  }, [resourceId, targets]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <form
          className="panel space-y-3 p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await onRun({
              action: "invite-progress",
              email,
              scopes: { progress: true },
              expiresHours: 168,
            });
            if (typeof result === "string") {
              onToken(result);
              toast.success(
                "One-time invitation created. The recipient must sign in with this email.",
              );
            }
          }}
        >
          <div>
            <h2 className="text-lg font-semibold">Share progress with a parent or teacher</h2>
            <p className="text-sm text-muted-foreground">
              An invite is restricted to the recipient's account email and expires in 7 days. You
              can revoke accepted access at any time.
            </p>
          </div>
          <Field label="Recipient's account email">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              maxLength={254}
              required
            />
          </Field>
          <p className="text-sm text-muted-foreground">
            Progress summary only: completed tasks, study minutes, course count, and quiz average.
          </p>
          <Button type="submit" disabled={busy}>
            Create invitation
          </Button>
        </form>
        <section className="panel space-y-3 p-5">
          <h2 className="text-lg font-semibold">Accept an invitation</h2>
          <p className="text-sm text-muted-foreground">
            Invitation tokens are one-time secrets. Progress invitations are checked against the
            signed-in email address.
          </p>
          <Input
            aria-label="Progress invitation token"
            value={token}
            onChange={(event) => onToken(event.target.value)}
            placeholder="Paste invitation token"
          />
          <Button
            disabled={busy || !token.trim()}
            onClick={async () => {
              const result = await onRun({ action: "accept-progress", token: token.trim() });
              if (result) {
                onToken("");
                toast.success("Progress sharing is now active.");
              }
            }}
          >
            Accept progress invitation
          </Button>
        </section>
      </div>
      {token ? (
        <div className="panel space-y-2 p-4">
          <p className="text-sm font-medium">New one-time token (shown only once)</p>
          <code className="block break-all text-xs">{token}</code>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCopy(token, "Progress invitation token")}
          >
            Copy token
          </Button>
          <p className="text-xs text-muted-foreground">
            Send this token to the recipient through a private channel. They must sign in using the
            invited email address.
          </p>
        </div>
      ) : null}

      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Active progress access</h2>
        {data.progress_shares.filter((share) => share.side === "owner" && !share.revoked_at)
          .length === 0 ? (
          <p className="text-sm text-muted-foreground">No active progress access grants.</p>
        ) : null}
        {data.progress_shares
          .filter((share) => share.side === "owner")
          .map((share) => (
            <div
              key={share.id}
              className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
            >
              <p className="min-w-0 flex-1 text-sm">
                {share.display_name} · {share.revoked_at ? "Revoked" : "Progress access"}
              </p>
              {!share.revoked_at ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onRun({ action: "revoke-progress", shareId: share.id })}
                >
                  Revoke access
                </Button>
              ) : null}
            </div>
          ))}
        {data.progress_invitations.map((invite) => (
          <div
            key={invite.id}
            className="flex flex-wrap items-center gap-2 border-b border-border py-2 last:border-0"
          >
            <p className="min-w-0 flex-1 text-sm">
              {invite.recipient_email} ·{" "}
              {invite.revoked_at
                ? "Revoked"
                : `Invite expires ${new Date(invite.expires_at).toLocaleString()}`}
            </p>
            {!invite.revoked_at ? (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() =>
                  void onRun({ action: "revoke-progress-invitation", invitationId: invite.id })
                }
              >
                Revoke invite
              </Button>
            ) : null}
          </div>
        ))}
      </section>
      <section className="panel space-y-3 p-5">
        <h2 className="font-semibold">Progress shared with you</h2>
        {data.progress_shares
          .filter((share) => share.side === "recipient" && !share.revoked_at)
          .map((share) => (
            <div key={share.id} className="flex items-center gap-2">
              <p className="min-w-0 flex-1 text-sm">{share.display_name}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setProgressId(share.id);
                  onShowProgress(share.id);
                }}
              >
                View summary
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void onRun({ action: "revoke-progress", shareId: share.id })}
              >
                Stop access
              </Button>
            </div>
          ))}
        {progressView && progressId ? (
          <div className="grid gap-2 rounded-xl bg-surface p-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-semibold">
              Shared summary for {progressView.display_name}
            </p>
            <Metric label="Courses" value={String(progressView.courses)} />
            <Metric label="Completed tasks" value={String(progressView.tasks_completed)} />
            <Metric label="Study hours" value={(progressView.study_minutes / 60).toFixed(1)} />
            <Metric
              label="Quiz average"
              value={
                progressView.recent_quiz_average === null
                  ? "—"
                  : `${progressView.recent_quiz_average}%`
              }
            />
          </div>
        ) : null}
      </section>

      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Share notes and flashcards with a group</h2>
          <p className="text-sm text-muted-foreground">
            Shares are snapshots, keep creator attribution, and never modify your original notes or
            deck. Revoking a share removes group access; imported personal copies remain with their
            importer.
          </p>
        </div>
        {data.groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Join a study group first.</p>
        ) : (
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={async (event) => {
              event.preventDefault();
              const result = await onRun({
                action: "share-resource",
                groupId: selectedGroup,
                resourceType,
                resourceId,
                permission,
              });
              if (result) toast.success("Study material shared with your group.");
            }}
          >
            <Field label="Study group">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={selectedGroup}
                onChange={(event) => setSelectedGroup(event.target.value)}
              >
                {data.groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Resource type">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value as typeof resourceType)}
              >
                <option value="note">Note</option>
                <option value="flashcard_deck">Flashcard deck</option>
              </select>
            </Field>
            <Field label="Your resource">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={resourceId}
                onChange={(event) => setResourceId(event.target.value)}
              >
                {targets.map((row) => (
                  <option key={row.id} value={row.id}>
                    {resourceType === "note"
                      ? (row as (typeof shareables.notes)[number]).title
                      : (row as (typeof shareables.decks)[number]).name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Permission">
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={permission}
                onChange={(event) => setPermission(event.target.value as typeof permission)}
              >
                <option value="view">View only</option>
                <option value="edit">Collaborative editing (shared copy)</option>
              </select>
            </Field>
            <Button type="submit" disabled={busy || !resourceId}>
              Share material
            </Button>
          </form>
        )}
        {data.shared_resources.map((resource) => (
          <article key={resource.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{resource.title}</p>
                <p className="text-xs text-muted-foreground">
                  {resource.resource_type === "note" ? "Note" : "Flashcard deck"} ·{" "}
                  {data.groups.find((group) => group.id === resource.group_id)?.name ?? "Group"} ·
                  By {resource.owner_name} ·{" "}
                  {resource.permission === "edit" ? "Editable shared copy" : "View only"}
                  {resource.revoked_at ? " · Revoked" : ""}
                </p>
              </div>
              {!resource.revoked_at && resource.is_owner ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => void onRun({ action: "revoke-resource", shareId: resource.id })}
                >
                  Revoke
                </Button>
              ) : null}
              {!resource.revoked_at ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={async () => {
                    const result = await onRun({ action: "import-resource", shareId: resource.id });
                    if (result) {
                      const parsed = z.object({ already_imported: z.boolean() }).safeParse(result);
                      toast.success(
                        parsed.success && parsed.data.already_imported
                          ? "You already imported this item; no duplicate was made."
                          : "A personal copy was added to your library.",
                      );
                      onRefreshUserData();
                    }
                  }}
                >
                  Import copy
                </Button>
              ) : null}
              {!resource.revoked_at && resource.permission === "edit" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(resource.id, JSON.stringify(resource.snapshot, null, 2))}
                >
                  Edit shared copy
                </Button>
              ) : null}
            </div>
            {editingId === resource.id ? (
              <div className="space-y-2">
                <Label htmlFor={`shared-edit-${resource.id}`}>Shared copy JSON</Label>
                <Textarea
                  id={`shared-edit-${resource.id}`}
                  rows={8}
                  value={editingValue}
                  onChange={(event) => onEditValue(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={async () => {
                      try {
                        const value = z
                          .record(z.string(), z.unknown())
                          .parse(JSON.parse(editingValue));
                        const result = await onRun({
                          action: "edit-resource",
                          shareId: resource.id,
                          value,
                        });
                        if (result !== null) {
                          onCancelEdit();
                          toast.success("Collaborative copy updated.");
                        }
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Shared copy must be valid JSON.",
                        );
                      }
                    }}
                  >
                    Save changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
            {!resource.revoked_at && resource.resource_type === "note" ? (
              <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                {String(resource.snapshot["content"] ?? "")}
              </p>
            ) : null}
            {!resource.revoked_at && resource.resource_type === "flashcard_deck" ? (
              <p className="text-sm text-muted-foreground">
                {Array.isArray(resource.snapshot["cards"]) ? resource.snapshot["cards"].length : 0}{" "}
                shared cards
              </p>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

function LmsPanel({ status }: { status: LMSStatus | null }) {
  const providers = [
    [
      "Google Classroom",
      status?.googleClassroom.credentialsPresent ?? false,
      "GOOGLE_CLASSROOM_CLIENT_ID, GOOGLE_CLASSROOM_CLIENT_SECRET, GOOGLE_CLASSROOM_REDIRECT_URI",
    ],
    [
      "Canvas LMS",
      status?.canvas.credentialsPresent ?? false,
      "CANVAS_CLIENT_ID, CANVAS_CLIENT_SECRET, CANVAS_BASE_URL, CANVAS_REDIRECT_URI",
    ],
    [
      "Moodle",
      status?.moodle.credentialsPresent ?? false,
      "MOODLE_CLIENT_ID, MOODLE_CLIENT_SECRET, MOODLE_BASE_URL, MOODLE_REDIRECT_URI",
    ],
  ] as const;
  return (
    <div className="space-y-4">
      <section className="panel space-y-3 p-5">
        <div className="flex items-center gap-2">
          <LockKeyhole className="size-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Learning-management integrations</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No provider tokens are stored or sent to the browser. OAuth connections are not enabled in
          this deployment yet; setting secrets alone will not create a connection.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {providers.map(([name, present, variables]) => (
            <article key={name} className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">{name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {present
                  ? "Environment variables detected; OAuth implementation is still disabled."
                  : "Not configured."}
              </p>
              <code className="mt-3 block break-words text-[11px] text-muted-foreground">
                {variables}, LMS_TOKEN_ENCRYPTION_KEY
              </code>
            </article>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Google requires a verified OAuth consent screen and Classroom API scopes. Canvas requires
          a registered developer key and institution URL. Moodle OAuth/API setup is specific to each
          Moodle administrator's enabled services; Moodle does not expose a single universal
          Classroom-style API contract.
        </p>
      </section>
      <section className="panel space-y-2 p-5">
        <h3 className="font-semibold">Security boundary</h3>
        <p className="text-sm text-muted-foreground">
          These providers remain unavailable rather than showing demo connect buttons. The
          application needs provider-specific authorization, token refresh/revocation, encrypted
          server-side token storage, and assignment synchronization before it can safely enable
          OAuth.
        </p>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactElement<{ id?: string }> }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {cloneElement(children, { id })}
    </div>
  );
}

function EmptyPanel({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="panel flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon className="size-6 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
