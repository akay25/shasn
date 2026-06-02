import { describe, it, expect, vi } from "vitest";
import {
  STUB_IDEOLOGY_CARDS,
  STUB_VOTER_CARDS,
  STUB_CONSPIRACY_CARDS,
  STUB_HEADLINE_CARDS,
  freshState,
  placeVoters,
} from "./_stubs";

vi.mock("@/data/cards/ideology",   () => ({ IDEOLOGY_CARDS:   STUB_IDEOLOGY_CARDS   }));
vi.mock("@/data/cards/voter",      () => ({ VOTER_CARDS:      STUB_VOTER_CARDS      }));
vi.mock("@/data/cards/conspiracy", () => ({ CONSPIRACY_CARDS: STUB_CONSPIRACY_CARDS }));
vi.mock("@/data/cards/headline",   () => ({ HEADLINE_CARDS:   STUB_HEADLINE_CARDS   }));

import { applyAction } from "@/engine/reducer";

describe("conspiracy: buy + play", () => {
  it("buys top of deck for stated cost", () => {
    let s = freshState();
    s.phase = "actions";
    // First card in deck is c-gain (cost 4).
    const r = applyAction(s, {
      t: "buyConspiracy",
      payment: { funds: 2, clout: 2 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0].conspiracyHand).toContain("c-gain");
    expect(r.state.players[0].resources.funds).toBe(0);
    expect(r.state.players[0].resources.clout).toBe(0);
  });

  it("rejects wrong payment total", () => {
    let s = freshState();
    s.phase = "actions";
    // c-gain costs 4; pay 3.
    const r = applyAction(s, {
      t: "buyConspiracy",
      payment: { funds: 3 },
    });
    expect(r.ok).toBe(false);
  });

  it("plays a gainResources card", () => {
    let s = freshState();
    s.phase = "actions";
    s.players[0].conspiracyHand.push("c-gain");
    const before = s.players[0].resources.funds;
    const r = applyAction(s, {
      t: "playConspiracy", cardId: "c-gain", params: {},
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0].resources.funds).toBe(before + 3);
    expect(r.state.players[0].conspiracyHand).not.toContain("c-gain");
  });

  it("discards opponent voter via conspiracy", () => {
    let s = freshState();
    s.phase = "actions";
    placeVoters(s, "n", "p2", 1);
    s.players[0].conspiracyHand.push("c-discard");
    const r = applyAction(s, {
      t: "playConspiracy",
      cardId: "c-discard",
      params: { targetPlayerId: "p2", zoneId: "n", slotIdx: 0 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.zones.n.slots[0]).toBeNull();
  });

  it("cannot discard voter in Volatile Area via conspiracy", () => {
    let s = freshState();
    s.phase = "actions";
    // n has volatile slot index 2.
    s.zones.n.slots[2] = { playerId: "p2", isMajority: false };
    s.players[0].conspiracyHand.push("c-discard");
    const r = applyAction(s, {
      t: "playConspiracy",
      cardId: "c-discard",
      params: { targetPlayerId: "p2", zoneId: "n", slotIdx: 2 },
    });
    expect(r.ok).toBe(false);
  });
});
