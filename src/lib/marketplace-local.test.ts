import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyOfflineMarketplaceDraft } from "./marketplace-local";
import type { Database } from "./store";

function emptyMarketplace(): Pick<
  Database,
  "offline_market_notes" | "offline_market_bounties" | "offline_market_wallets"
> {
  return {
    offline_market_notes: [],
    offline_market_bounties: [],
    offline_market_wallets: [],
  };
}

describe("private marketplace drafts", () => {
  it("saves a note once, awards local coins, and spends them on a local bounty", () => {
    const state = emptyMarketplace();
    const shared = applyOfflineMarketplaceDraft(
      state,
      "student",
      {
        action: "share-note",
        title: "Cell notes",
        subject: "Biology",
        content: "A private note with enough content to share safely.",
      },
      "2026-11-19T10:00:00.000Z",
    );
    assert.equal(shared.ok, true);
    assert.equal(state.offline_market_wallets[0]?.coins, 5);
    assert.equal(state.offline_market_notes[0]?.user_id, "student");

    const duplicate = applyOfflineMarketplaceDraft(state, "student", {
      action: "share-note",
      title: "Cell notes",
      subject: "Biology",
      content: "A private note with enough content to share safely.",
    });
    assert.equal(duplicate.ok, false);

    const bounty = applyOfflineMarketplaceDraft(state, "student", {
      action: "post-bounty",
      subject: "Biology",
      question: "How do chloroplasts convert light into chemical energy?",
      reward: 3,
    });
    assert.equal(bounty.ok, true);
    assert.equal(state.offline_market_bounties[0]?.reward, 3);
    assert.equal(state.offline_market_wallets[0]?.coins, 2);
  });

  it("rejects invalid rewards and never lets local drafts go negative", () => {
    const state = emptyMarketplace();
    const invalid = applyOfflineMarketplaceDraft(state, "student", {
      action: "post-bounty",
      subject: "Math",
      question: "Can I post this question?",
      reward: -5,
    });
    assert.equal(invalid.ok, false);
    assert.equal(state.offline_market_bounties.length, 0);
    assert.equal(state.offline_market_wallets.length, 0);
  });
});
