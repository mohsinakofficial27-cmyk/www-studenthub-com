import type {
  Database,
  OfflineBounty,
  OfflineMarketNote,
  OfflineMarketWallet,
} from "@/lib/store";
import { mutate, uid } from "@/lib/store";

export type MarketplaceDraftAction =
  | { action: "share-note"; title: string; subject: string; content: string }
  | { action: "post-bounty"; subject: string; question: string; reward: number }
  | { action: "answer-bounty"; bountyId: string; answer: string }
  | { action: "accept-answer"; bountyId: string; answerId: string };

type OfflineMarketplaceState = Pick<
  Database,
  "offline_market_notes" | "offline_market_bounties" | "offline_market_wallets"
>;

export type OfflineMarketplaceResult = { ok: true; message: string } | { ok: false; error: string };

export function applyOfflineMarketplaceDraft(
  state: OfflineMarketplaceState,
  userId: string,
  action: MarketplaceDraftAction,
  now = new Date().toISOString(),
): OfflineMarketplaceResult {
  if (action.action === "share-note") {
    if (action.content.trim().length < 20) {
      return { ok: false, error: "Add at least 20 characters before sharing a note." };
    }
    const duplicate = state.offline_market_notes.some(
      (note) => note.user_id === userId && note.content.trim() === action.content.trim(),
    );
    if (duplicate) return { ok: false, error: "You have already shared this note in this browser." };

    const note: OfflineMarketNote = {
      id: uid(),
      user_id: userId,
      title: action.title.trim() || "Shared study note",
      subject: action.subject.trim() || "General",
      content: action.content.trim(),
      created_at: now,
    };
    state.offline_market_notes.unshift(note);
    const wallet = state.offline_market_wallets.find((item) => item.user_id === userId);
    if (wallet) wallet.coins += 5;
    else {
      const newWallet: OfflineMarketWallet = { user_id: userId, coins: 5 };
      state.offline_market_wallets.push(newWallet);
    }
    return { ok: true, message: "Saved privately in this browser. You earned 5 local study coins." };
  }

  if (action.action === "post-bounty") {
    if (action.reward < 3 || action.reward > 100) {
      return { ok: false, error: "Choose a bounty reward between 3 and 100 study coins." };
    }
    const wallet = state.offline_market_wallets.find((item) => item.user_id === userId);
    if (!wallet || wallet.coins < action.reward) {
      return { ok: false, error: "Not enough local study coins. Share one of your notes to earn 5." };
    }

    const bounty: OfflineBounty = {
      id: uid(),
      user_id: userId,
      subject: action.subject.trim(),
      question: action.question.trim(),
      reward: action.reward,
      created_at: now,
      status: "open",
      accepted_answer_id: null,
    };
    state.offline_market_bounties.unshift(bounty);
    wallet.coins -= action.reward;
    return { ok: true, message: "Bounty saved privately in this browser." };
  }

  return {
    ok: false,
    error: "Peer answers and coin awards need the Supabase marketplace migration. Your local exchange is private to this browser.",
  };
}

export function saveOfflineMarketplaceDraft(
  userId: string,
  action: MarketplaceDraftAction,
): OfflineMarketplaceResult {
  let outcome: OfflineMarketplaceResult | null = null;
  mutate((state) => {
    outcome = applyOfflineMarketplaceDraft(state, userId, action);
  });
  return outcome ?? { ok: false, error: "Could not save this browser-only draft." };
}
