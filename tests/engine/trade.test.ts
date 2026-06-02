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

describe("trade", () => {
  it("happy path: exchange resources", () => {
    let s = freshState();
    s.phase = "actions";
    const r = applyAction(s, {
      t: "trade", withPlayerId: "p2",
      give: { resources: { funds: 2 } },
      receive: { resources: { clout: 1 } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Starts at 2 each (from _stubs freshState).
    expect(r.state.players[0].resources.funds).toBe(0); // 2 - 2
    expect(r.state.players[0].resources.clout).toBe(3); // 2 + 1
    expect(r.state.players[1].resources.funds).toBe(4); // 2 + 2
    expect(r.state.players[1].resources.clout).toBe(1); // 2 - 1
  });

  it("requires both sides to exchange at least one item", () => {
    let s = freshState();
    s.phase = "actions";
    const r = applyAction(s, {
      t: "trade", withPlayerId: "p2",
      give: { resources: { funds: 2 } },
      receive: { resources: {} },
    });
    expect(r.ok).toBe(false);
  });

  it("rejects trade if active player can't pay", () => {
    let s = freshState();
    s.phase = "actions";
    s.players[0].resources.funds = 1;
    const r = applyAction(s, {
      t: "trade", withPlayerId: "p2",
      give: { resources: { funds: 2 } },
      receive: { resources: { clout: 1 } },
    });
    expect(r.ok).toBe(false);
  });

  it("can exchange conspiracy cards", () => {
    let s = freshState();
    s.phase = "actions";
    s.players[0].conspiracyHand.push("c-gain");
    s.players[1].conspiracyHand.push("c-extra");
    const r = applyAction(s, {
      t: "trade", withPlayerId: "p2",
      give: { conspiracyCardIds: ["c-gain"] },
      receive: { conspiracyCardIds: ["c-extra"] },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.players[0].conspiracyHand).toEqual(["c-extra"]);
    expect(r.state.players[1].conspiracyHand).toEqual(["c-gain"]);
  });
});
