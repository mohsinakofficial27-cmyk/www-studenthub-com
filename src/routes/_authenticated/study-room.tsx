import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  CameraOff,
  Copy,
  DoorOpen,
  Link2,
  Mail,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Send,
  Users,
  Video,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";

const JITSI_DOMAIN = "meet.jit.si";
const MAX_MESSAGE_LENGTH = 1000;

interface JitsiEvent {
  message?: string;
  nick?: string;
  from?: string;
  participantId?: string;
  on?: boolean;
}

interface JitsiMeetExternalApi {
  addListener(event: string, callback: (event: JitsiEvent) => void): void;
  executeCommand(command: string, ...args: string[]): void;
  dispose(): void;
}

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: {
        roomName: string;
        parentNode: HTMLElement;
        width: string;
        height: string;
        userInfo: { displayName: string };
        configOverwrite: Record<string, unknown>;
      },
    ) => JitsiMeetExternalApi;
  }
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  own: boolean;
  time: string;
}

let jitsiApiLoad: Promise<void> | null = null;

function loadJitsiApi() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve();
  if (!jitsiApiLoad) {
    jitsiApiLoad = new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://${JITSI_DOMAIN}/external_api.js`;
      script.async = true;
      script.onload = () => {
        if (window.JitsiMeetExternalAPI) resolve();
        else reject(new Error("The video meeting service did not initialize."));
      };
      script.onerror = () => {
        script.remove();
        reject(new Error("Could not load the video meeting service. Check your connection."));
      };
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      jitsiApiLoad = null;
      throw error;
    });
  }
  return jitsiApiLoad;
}

function createRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function normalizeRoomCode(value: string) {
  return value
    .replace(/[^a-f0-9]/gi, "")
    .slice(0, 32)
    .toLowerCase();
}

function formatRoomCode(value: string) {
  return value.match(/.{1,4}/g)?.join(" ") ?? value;
}

function addChatMessage(sender: string, text: string, own: boolean): ChatMessage {
  return {
    id: crypto.randomUUID(),
    sender,
    text,
    own,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function StudyRoomPage() {
  const { user, profile } = useAuth();
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [meetingState, setMeetingState] = useState<"connecting" | "connected" | "error">(
    "connecting",
  );
  const [meetingError, setMeetingError] = useState("");
  const [participantCount, setParticipantCount] = useState(1);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const meetingRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const jitsiRef = useRef<JitsiMeetExternalApi | null>(null);

  const roomLink =
    typeof window === "undefined" || !roomCode
      ? ""
      : `${window.location.origin}/study-room?room=${roomCode}`;

  useEffect(() => {
    const invitedRoom = new URLSearchParams(window.location.search).get("room");
    const normalized = invitedRoom ? normalizeRoomCode(invitedRoom) : "";
    if (normalized.length === 32) setJoinCode(normalized);
  }, []);

  useEffect(() => {
    if (!meetingCode || !meetingRef.current) return;
    let cancelled = false;
    let api: JitsiMeetExternalApi | null = null;
    setMeetingState("connecting");
    setMeetingError("");
    setParticipantCount(1);
    setCameraOn(false);
    setMicOn(false);
    setChat([]);

    void loadJitsiApi()
      .then(() => {
        if (cancelled) return;
        if (!meetingRef.current || !window.JitsiMeetExternalAPI) {
          throw new Error("The video meeting could not be opened.");
        }
        api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
          roomName: `studenthub-${meetingCode}`,
          parentNode: meetingRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: profile?.name || user?.name || "Student" },
          configOverwrite: {
            prejoinConfig: { enabled: false },
            startWithAudioMuted: true,
            startWithVideoMuted: true,
            toolbarButtons: [],
          },
        });
        jitsiRef.current = api;
        api.addListener("videoConferenceJoined", () => {
          setMeetingState("connected");
        });
        api.addListener("participantJoined", () => {
          setParticipantCount((count) => count + 1);
        });
        api.addListener("participantLeft", () => {
          setParticipantCount((count) => Math.max(1, count - 1));
        });
        api.addListener("incomingMessage", (event) => {
          const message = event.message;
          if (typeof message !== "string" || !message.trim()) return;
          setChat((messages) => [
            ...messages,
            addChatMessage(event.nick || "Study partner", message, false),
          ]);
        });
        api.addListener("outgoingMessage", (event) => {
          const message = event.message;
          if (typeof message !== "string" || !message.trim()) return;
          setChat((messages) => [
            ...messages,
            addChatMessage(profile?.name || user?.name || "You", message, true),
          ]);
        });
        api.addListener("screenSharingStatusChanged", (event) => {
          setSharingScreen(Boolean(event.on));
        });
        api.addListener("readyToClose", () => {
          setMeetingCode("");
        });
        api.addListener("cameraError", () => {
          toast.error("Camera access failed. Check your browser permissions.");
          setCameraOn(false);
        });
        api.addListener("micError", () => {
          toast.error("Microphone access failed. Check your browser permissions.");
          setMicOn(false);
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Could not connect to the video meeting.";
        setMeetingError(message);
        setMeetingState("error");
      });

    return () => {
      cancelled = true;
      api?.dispose();
      if (jitsiRef.current === api) jitsiRef.current = null;
    };
  }, [meetingCode, profile?.name, user?.name]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat]);

  const joinRoom = useCallback((code: string) => {
    if (code.length !== 32) {
      toast.error("Enter a valid 32-character room code or open an invite link.");
      return;
    }
    setRoomCode(code);
    setMeetingCode(code);
  }, []);

  const createRoom = () => {
    try {
      const code = createRoomCode();
      setRoomCode(code);
      setMeetingCode(code);
    } catch (error) {
      console.error("Could not create a secure study room code", error);
      toast.error("Your browser could not create a secure room code. Try a modern browser.");
    }
  };

  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      toast.success("Room invite link copied.");
    } catch (error) {
      console.error("Could not copy the study room invite link", error);
      toast.error("Could not access the clipboard. Select and copy the invite link shown above.");
    }
  };

  const leaveRoom = () => {
    jitsiRef.current?.executeCommand("hangup");
    setMeetingCode("");
    setChat([]);
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || !jitsiRef.current) return;
    if (message.length > MAX_MESSAGE_LENGTH) {
      toast.error(`Messages must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }
    jitsiRef.current.executeCommand("sendChatMessage", message);
    setChatInput("");
  };

  const inviteByEmail = () => {
    const subject = encodeURIComponent("Join my Student Hub study room");
    const body = encodeURIComponent(
      `Join my live study session on Student Hub: ${roomLink}\n\nRoom code: ${formatRoomCode(roomCode)}\n\nAnyone with this link can join. Please share it privately.`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  return (
    <AppShell title="Group Study Room" description="Meet with classmates for a live study session.">
      {!meetingCode ? (
        <div className="mx-auto max-w-4xl space-y-5">
          <section className="panel overflow-hidden p-6 sm:p-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-accent-foreground">
                  <Video className="size-3.5" /> Live study session
                </span>
                <h2 className="mt-4 text-2xl font-semibold sm:text-3xl">Study better, together.</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Start a room and invite friends with a private link or room code. Video, audio,
                  screen sharing and live chat are built in.
                </p>
              </div>
              <Button
                onClick={createRoom}
                className="shrink-0 bg-brand text-brand-foreground hover:bg-brand/90"
              >
                <Users className="size-4" /> Create a study room
              </Button>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-secondary">
                <Link2 className="size-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold">Have an invite?</h3>
                <p className="text-sm text-muted-foreground">
                  Join with the room code your friend shared.
                </p>
              </div>
            </div>
            <form
              className="mt-5 flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                joinRoom(normalizeRoomCode(joinCode));
              }}
            >
              <Input
                value={joinCode}
                onChange={(event) => setJoinCode(normalizeRoomCode(event.target.value))}
                placeholder="Paste the 32-character room code"
                aria-label="Study room code"
                autoComplete="off"
                className="font-mono tracking-wider"
              />
              <Button type="submit" variant="outline" className="sm:min-w-28">
                Join room
              </Button>
            </form>
          </section>

          <section className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/5 p-4 text-sm">
            <span className="mt-0.5 text-warning" aria-hidden>
              i
            </span>
            <p className="leading-6 text-muted-foreground">
              Rooms use the public Jitsi Meet service and require an internet connection. Anyone
              with the invite link can join; share it privately. Room codes and chat are not saved
              in your Student Hub account.
            </p>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">Study room</h2>
                <span
                  role="status"
                  className="rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground"
                >
                  {meetingState === "connected"
                    ? `${participantCount} participant${participantCount === 1 ? "" : "s"}`
                    : meetingState === "error"
                      ? "Connection issue"
                      : "Connecting…"}
                </span>
              </div>
              <p className="mt-1 font-mono text-xs tracking-wider text-muted-foreground">
                {formatRoomCode(roomCode)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => void copyRoomLink()}>
                <Copy className="size-4" /> Copy invite
              </Button>
              <Button variant="outline" size="sm" onClick={inviteByEmail}>
                <Mail className="size-4" /> Email invite
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3 sm:flex-row sm:items-center">
            <label htmlFor="study-room-link" className="shrink-0 text-xs font-medium">
              Invite link
            </label>
            <Input
              id="study-room-link"
              value={roomLink}
              readOnly
              aria-label="Study room invite link"
              className="min-w-0 flex-1 text-xs"
            />
          </div>

          {meetingError ? (
            <div
              role="alert"
              className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"
            >
              <p className="text-sm font-medium">Could not join this room</p>
              <p className="mt-1 text-sm text-muted-foreground">{meetingError}</p>
              <Button
                className="mt-3"
                size="sm"
                variant="outline"
                onClick={() => setMeetingCode("")}
              >
                Back to rooms
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
              <section className="min-w-0 space-y-3">
                <div
                  ref={meetingRef}
                  className="ai-glow-border min-h-[360px] overflow-hidden rounded-2xl bg-slate-950 sm:min-h-[480px]"
                  aria-label="Live video meeting"
                />
                <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-border bg-card p-3">
                  <Button
                    variant={micOn ? "outline" : "destructive"}
                    aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                    disabled={meetingState !== "connected"}
                    onClick={() => {
                      jitsiRef.current?.executeCommand("toggleAudio");
                      setMicOn((value) => !value);
                    }}
                  >
                    {micOn ? <Mic /> : <MicOff />}
                    <span className="hidden sm:inline">{micOn ? "Mute" : "Unmute"}</span>
                  </Button>
                  <Button
                    variant={cameraOn ? "outline" : "destructive"}
                    aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                    disabled={meetingState !== "connected"}
                    onClick={() => {
                      jitsiRef.current?.executeCommand("toggleVideo");
                      setCameraOn((value) => !value);
                    }}
                  >
                    {cameraOn ? <Camera /> : <CameraOff />}
                    <span className="hidden sm:inline">
                      {cameraOn ? "Camera off" : "Camera on"}
                    </span>
                  </Button>
                  <Button
                    variant={sharingScreen ? "secondary" : "outline"}
                    aria-label={sharingScreen ? "Stop screen sharing" : "Share screen"}
                    disabled={meetingState !== "connected"}
                    onClick={() => jitsiRef.current?.executeCommand("toggleShareScreen")}
                  >
                    <MonitorUp />
                    <span className="hidden sm:inline">
                      {sharingScreen ? "Stop sharing" : "Share screen"}
                    </span>
                  </Button>
                  <Button variant="destructive" onClick={leaveRoom}>
                    <DoorOpen className="size-4" /> Leave room
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Your camera and microphone start off. Turn them on when you are ready; allow
                  browser permissions when prompted.
                </p>
              </section>

              <aside className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-border bg-card xl:min-h-0">
                <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                  <MessageSquare className="size-4 text-brand" />
                  <h3 className="text-sm font-semibold">Room chat & notes</h3>
                  <span className="ms-auto text-xs text-muted-foreground">Live</span>
                </div>
                <div
                  className="flex-1 space-y-3 overflow-y-auto p-4"
                  aria-live="polite"
                  aria-label="Room chat messages"
                >
                  {chat.length === 0 ? (
                    <div className="grid h-full min-h-48 place-items-center text-center">
                      <div>
                        <MessageSquare className="mx-auto size-8 text-muted-foreground/50" />
                        <p className="mt-3 text-sm font-medium">Share an idea or a note</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Messages are only available during this call.
                        </p>
                      </div>
                    </div>
                  ) : (
                    chat.map((message) => (
                      <div
                        key={message.id}
                        className={`max-w-[90%] rounded-2xl px-3 py-2 ${
                          message.own ? "ms-auto bg-brand-soft" : "bg-secondary"
                        }`}
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-xs font-semibold">{message.sender}</span>
                          <time className="text-[10px] text-muted-foreground">{message.time}</time>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                          {message.text}
                        </p>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={sendMessage} className="border-t border-border p-3">
                  <label className="sr-only" htmlFor="study-room-message">
                    Message or share a study note
                  </label>
                  <div className="flex items-end gap-2">
                    <textarea
                      id="study-room-message"
                      value={chatInput}
                      onChange={(event) => setChatInput(event.target.value)}
                      placeholder="Message or share a study note…"
                      maxLength={MAX_MESSAGE_LENGTH}
                      rows={2}
                      className="min-h-10 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      aria-label="Send message"
                      disabled={!chatInput.trim() || meetingState !== "connected"}
                      className="bg-brand text-brand-foreground hover:bg-brand/90"
                    >
                      <Send className="size-4" />
                    </Button>
                  </div>
                </form>
              </aside>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

export const Route = createFileRoute("/_authenticated/study-room")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Group Study Room — Student Hub" },
      {
        name: "description",
        content: "Study together with live video, audio, screen sharing and room chat.",
      },
    ],
  }),
  component: StudyRoomPage,
});
