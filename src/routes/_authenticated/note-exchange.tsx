import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Coins, Gift, MessageSquareText, RefreshCw, Send, Share2, Trophy } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app-shell";
import { InfoNote } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useDb } from "@/lib/auth";
import { getMarketplaceSnapshot, runMarketplaceAction } from "@/lib/marketplace.functions";
import { saveOfflineMarketplaceDraft } from "@/lib/marketplace-local";

export const Route = createFileRoute("/_authenticated/note-exchange")({
  component: NoteExchangePage,
});

const AnswerSchema = z.object({
  id: z.string(),
  answer: z.string(),
  mine: z.boolean(),
  accepted: z.boolean(),
  created_at: z.string(),
});
const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  content: z.string(),
  mine: z.boolean(),
  created_at: z.string(),
});
const BountySchema = z.object({
  id: z.string(),
  subject: z.string(),
  question: z.string(),
  reward: z.number(),
  status: z.enum(["open", "answered", "closed"]),
  mine: z.boolean(),
  created_at: z.string(),
  answers: z.array(AnswerSchema),
});
const SnapshotSchema = z.object({
  balance: z.number(),
  notes: z.array(NoteSchema),
  bounties: z.array(BountySchema),
});
const ActionResultSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  earned: z.number().optional(),
  awarded: z.number().optional(),
});
type MarketSnapshot = z.infer<typeof SnapshotSchema>;

function isMarketplaceUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /MARKETPLACE_UNREACHABLE|failed to fetch|fetch failed|network error|connection refused|timed out/i.test(
    message,
  );
}

function NoteExchangePage() {
  const { user } = useAuth();
  const db = useDb();
  const loadSnapshot = useServerFn(getMarketplaceSnapshot);
  const runAction = useServerFn(runMarketplaceAction);
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null);
  const [onlineMarketplace, setOnlineMarketplace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [shareNoteId, setShareNoteId] = useState("");
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [reward, setReward] = useState(5);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const localNotes = user ? db.offline_market_notes.filter((note) => note.user_id === user.id) : [];
  const localBounties = user ? db.offline_market_bounties.filter((bounty) => bounty.user_id === user.id) : [];
  const localWallet = user ? db.offline_market_wallets.find((wallet) => wallet.user_id === user.id)?.coins ?? 0 : 0;
  const ownNotes = user ? db.notes.filter((note) => note.user_id === user.id) : [];

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const result = await loadSnapshot();
      if (result.configured) {
        const parsed = SnapshotSchema.safeParse(result.data);
        if (!parsed.success) throw new Error("The marketplace returned an invalid response.");
        setSnapshot(parsed.data);
        setOnlineMarketplace(true);
        setMigrationMissing(false);
        setConnectionFailed(false);
        setSetupRequired(false);
      } else {
        setSnapshot(null);
        setOnlineMarketplace(false);
        setMigrationMissing(true);
        setConnectionFailed(false);
        setSetupRequired(false);
      }
    } catch (error) {
      console.error("Could not load note exchange", error);
      setSnapshot(null);
      setOnlineMarketplace(false);
      setMigrationMissing(false);
      const unavailable = isMarketplaceUnavailable(error);
      setConnectionFailed(unavailable);
      setSetupRequired(!unavailable);
      if (unavailable) {
        toast.info(
          "Peer marketplace is unavailable; your private browser-only exchange is still available.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loadSnapshot, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const execute = async (
    payload:
      | { action: "share-note"; title: string; subject: string; content: string }
      | { action: "post-bounty"; subject: string; question: string; reward: number }
      | { action: "answer-bounty"; bountyId: string; answer: string }
      | { action: "accept-answer"; bountyId: string; answerId: string },
  ) => {
    if (!user) return false;
    if (payload.action === "post-bounty" && (payload.reward < 3 || payload.reward > 100)) {
      toast.error("Choose a bounty reward between 3 and 100 study coins.");
      return false;
    }
    try {
      const result = await runAction({ data: payload });
      if (result.configured) {
        const parsed = ActionResultSchema.safeParse(result.data);
        if (!parsed.success || !parsed.data.ok) {
          toast.error(parsed.success ? parsed.data.error ?? "That exchange action could not be completed." : "Marketplace returned an invalid response.");
          return false;
        }
        const response = parsed.data;
        if (response.earned) toast.success(`Note shared. You earned ${response.earned} study coins.`);
        if (response.awarded) toast.success(`Answer accepted. ${response.awarded} study coins awarded.`);
        await refresh();
        return true;
      }
      setSnapshot(null);
      setOnlineMarketplace(false);
      setMigrationMissing(true);
      setConnectionFailed(false);
      setSetupRequired(false);
    } catch (error) {
      console.error("Peer marketplace operation failed", error);
      setSnapshot(null);
      setOnlineMarketplace(false);
      setMigrationMissing(false);
      const unavailable = isMarketplaceUnavailable(error);
      setConnectionFailed(unavailable);
      setSetupRequired(!unavailable);
    }

    if (payload.action === "share-note") {
      const outcome = saveOfflineMarketplaceDraft(user.id, payload);
      if (outcome.ok) toast.success(outcome.message);
      else toast.info(outcome.error);
      return outcome.ok;
    }
    if (payload.action === "post-bounty") {
      const outcome = saveOfflineMarketplaceDraft(user.id, payload);
      if (outcome.ok) toast.success(outcome.message);
      else toast.info(outcome.error);
      return outcome.ok;
    }
    toast.info("Peer answers and coin awards need the Supabase marketplace migration. Your local exchange is private to this browser.");
    return false;
  };

  const share = async (event: FormEvent) => {
    event.preventDefault();
    const note = ownNotes.find((item) => item.id === shareNoteId);
    if (!note) {
      toast.error("Choose one of your saved notes.");
      return;
    }
    if (await execute({ action: "share-note", title: note.title, subject: note.subject || "General", content: note.content })) {
      setShareNoteId("");
    }
  };

  const postBounty = async (event: FormEvent) => {
    event.preventDefault();
    if (await execute({ action: "post-bounty", subject, question, reward })) {
      setSubject("");
      setQuestion("");
    }
  };

  const submitAnswer = async (event: FormEvent, bountyId: string) => {
    event.preventDefault();
    const answer = answers[bountyId]?.trim() ?? "";
    if (!answer) return;
    if (await execute({ action: "answer-bounty", bountyId, answer })) {
      setAnswers((current) => ({ ...current, [bountyId]: "" }));
    }
  };

  if (!user) return null;
  const notes = snapshot?.notes ?? localNotes.map((note) => ({ ...note, mine: true }));
  const bounties = snapshot?.bounties ?? localBounties.map((bounty) => ({ ...bounty, mine: true, answers: [] }));
  const coins = onlineMarketplace ? snapshot?.balance ?? 0 : localWallet;

  return (
    <AppShell title="Peer Note Exchange & Doubt Bounties" description="Share study notes to earn coins and put a coin reward on a question for peer help.">
      {onlineMarketplace ? (
        <InfoNote title="Peer marketplace connected" description="Notes, questions, and virtual coin transactions are saved by the protected Supabase marketplace functions." />
      ) : connectionFailed ? (
        <InfoNote
          title="Peer marketplace connection unavailable"
          description={
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>The marketplace could not be reached. You can save private browser-only notes and bounty drafts; they are not published or visible to other students.</span>
              <Button size="sm" variant="outline" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Retry Connection</Button>
            </span>
          }
        />
      ) : migrationMissing ? (
        <InfoNote
          title="Private browser-only mode"
          description={
            <span>
              The peer marketplace migration is not installed. You can save note shares and bounty
              drafts locally, but they are not visible to other students; peer answers and awards
              need the Supabase marketplace migration.
            </span>
          }
        />
      ) : setupRequired ? (
        <InfoNote
          title="Peer marketplace setup required"
          description="The marketplace could not be initialized. Check the Supabase environment variables, apply the peer marketplace migration, and verify its RPC grants."
        />
      ) : (
        <InfoNote title="Loading peer marketplace" description="Your notes and bounty board will appear when the marketplace responds. Browser-only drafts remain private." />
      )}
      <div className="mt-4 flex items-center justify-between rounded-2xl border border-brand/20 bg-brand-soft/40 p-4">
        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-background text-warning"><Coins className="size-5" /></span><div><p className="font-semibold">{coins} study coins</p><p className="text-xs text-muted-foreground">Earn 5 for each original note shared</p></div></div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <form onSubmit={(event) => void share(event)} className="panel space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Share2 className="size-4 text-brand" /> Share your notes</h2>
          <p className="text-sm text-muted-foreground">Choose a saved note. Its study content will be visible to exchange users.</p>
          <label htmlFor="market-note" className="text-sm font-medium">Saved note</label>
          <select id="market-note" value={shareNoteId} onChange={(event) => setShareNoteId(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Choose a note</option>
            {ownNotes.map((note) => <option key={note.id} value={note.id}>{note.title} · {note.subject}</option>)}
          </select>
          <Button type="submit" disabled={!shareNoteId || loading} className="bg-brand text-brand-foreground hover:bg-brand/90"><BookOpen className="size-4" /> Share and earn 5 coins</Button>
        </form>

        <form onSubmit={(event) => void postBounty(event)} className="panel space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Gift className="size-4 text-brand" /> Post a doubt bounty</h2>
          <Input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={80} placeholder="Subject" aria-label="Bounty subject" />
          <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} required minLength={10} maxLength={3000} placeholder="Describe the question you need help with…" aria-label="Bounty question" />
          <div className="flex items-center gap-3"><label htmlFor="bounty-reward" className="text-sm font-medium">Reward (3–100)</label><Input id="bounty-reward" type="number" min={3} max={100} value={reward} onChange={(event) => setReward(Number(event.target.value))} className="max-w-28" /></div>
          <Button type="submit" disabled={loading || !subject.trim() || question.trim().length < 10 || reward < 3 || reward > 100} className="bg-brand text-brand-foreground hover:bg-brand/90"><Coins className="size-4" /> Escrow {reward} coins</Button>
        </form>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Shared notes ({notes.length})</h2>
          <div className="space-y-3">
            {notes.map((note) => <article key={note.id} className="panel p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{note.subject}{note.mine ? " · Your share" : " · Student share"}</p><h3 className="mt-1 font-semibold">{note.title}</h3></div><BookOpen className="size-4 shrink-0 text-brand" /></div><p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p></article>)}
            {!notes.length ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No notes shared yet. Be the first to share a saved note.</p> : null}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Open doubt bounties ({bounties.filter((item) => item.status === "open").length})</h2>
          <div className="space-y-3">
            {bounties.map((bounty) => (
              <article key={bounty.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{bounty.subject}{bounty.mine ? " · Your bounty" : " · Student bounty"}</p><p className="mt-1 font-medium">{bounty.question}</p></div><span className="flex shrink-0 items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium"><Coins className="size-3" />{bounty.reward}</span></div>
                {bounty.answers.map((answer) => <div key={answer.id} className="mt-3 rounded-xl bg-secondary/60 p-3"><p className="text-sm">{answer.answer}</p>{answer.accepted ? <p className="mt-1 flex items-center gap-1 text-xs font-medium text-brand"><Trophy className="size-3" /> Accepted answer</p> : null}{bounty.mine && bounty.status === "open" ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => void execute({ action: "accept-answer", bountyId: bounty.id, answerId: answer.id })}>Accept · award {bounty.reward}</Button> : null}</div>)}
                {!bounty.mine && bounty.status === "open" && onlineMarketplace ? <form onSubmit={(event) => void submitAnswer(event, bounty.id)} className="mt-3 flex gap-2"><Input value={answers[bounty.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [bounty.id]: event.target.value }))} minLength={10} maxLength={3000} placeholder="Write a helpful answer…" aria-label="Bounty answer" /><Button type="submit" disabled={(answers[bounty.id]?.trim().length ?? 0) < 10}><Send className="size-4" /> Answer</Button></form> : null}
                {!onlineMarketplace ? <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><MessageSquareText className="size-4" /> Peer answers are disabled in private browser mode.</p> : null}
                {bounty.status !== "open" ? <p className="mt-3 text-xs text-muted-foreground">Bounty {bounty.status}</p> : null}
              </article>
            ))}
            {!bounties.length ? <p className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">No bounties yet. Post one and escrow coins for a useful answer.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
