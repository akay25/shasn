import { describe, it, expect, vi } from "vitest";
import {
  STUB_IDEOLOGY_CARDS,
  STUB_VOTER_CARDS,
  STUB_CONSPIRACY_CARDS,
  STUB_HEADLINE_CARDS,
  freshState,
} from "./_stubs";

vi.mock("@/data/cards/ideology",   () => ({ IDEOLOGY_CARDS:   STUB_IDEOLOGY_CARDS   }));
vi.mock("@/data/cards/voter",      () => ({ VOTER_CARDS:      STUB_VOTER_CARDS      }));
vi.mock("@/data/cards/conspiracy", () => ({ CONSPIRACY_CARDS: STUB_CONSPIRACY_CARDS }));
vi.mock("@/data/cards/headline",   () => ({ HEADLINE_CARDS:   STUB_HEADLINE_CARDS   }));

import { applyAction } from "@/engine/reducer";

describe("headlines", () => {
  it("placing a voter in a Volatile Area queues a headline", () => {
    let s = freshState();
    s.phase = "actions";
    // Influence v1-a (cost 1 funds). Then place into n's volatile slot 4
    // (n's volatile slot indices are [4, 16]).
    const inf = applyAction(s, {
      t: "influenceVoterCard", openIdx: 0, payment: { funds: 1 },
    });
    if (!inf.ok) throw new Error(inf.error);
    expect(inf.state.pendingPlacements.length).toBe(1);
    const pl = applyAction(inf.state, {
      t: "placeVoter", zoneId: "n", slotIdx: 4, pendingIdx: 0,
    });
    if (!pl.ok) throw new Error(pl.error);
    expect(pl.state.pendingHeadlines).toBe(1);
  });

  it("endTurn with pending headlines transitions to headlines phase", () => {
    let s = freshState();
    s.phase = "actions";
    s.pendingHeadlines = 1;
    const r = applyAction(s, { t: "endTurn" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.phase).toBe("headlines");
  });

  it("resolves a gainResources headline", () => {
    let s = freshState();
    s.phase = "headlines";
    s.pendingHeadlines = 1;
    // Force the next headline to be h-gain.
    s.decks.headline = ["h-gain", "h-lose"];
    const before = s.players[0].resources.funds;
    const r = applyAction(s, { t: "resolveHeadline", params: {} });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0].resources.funds).toBe(before + 2);
    expect(r.state.pendingHeadlines).toBe(0);
  });

  it("resolves a globalResourceShift headline applies to all players", () => {
    let s = freshState();
    s.phase = "headlines";
    s.pendingHeadlines = 1;
    // Force the next headline to be h-global.
    s.decks.headline = ["h-global", "h-gain", "h-lose"];
    const r = applyAction(s, { t: "resolveHeadline", params: {} });
    if (!r.ok) throw new Error(r.error);
    // Started at 2; -1 → 1.
    expect(r.state.players[0].resources.media).toBe(1);
    expect(r.state.players[1].resources.media).toBe(1);
  });
});
