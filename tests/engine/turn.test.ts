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
import { recomputeMajorities } from "@/engine/rules/majorities";

describe("turn flow", () => {
  it("handoff → ideology → actions → endTurn → next player handoff", () => {
    let s = freshState();
    expect(s.phase).toBe("handoff");
    const a = applyAction(s, { t: "acknowledgeHandoff" });
    if (!a.ok) throw new Error(a.error);
    expect(a.state.phase).toBe("ideology");
    const ans = applyAction(a.state, { t: "answerIdeology", side: "left" });
    if (!ans.ok) throw new Error(ans.error);
    expect(ans.state.phase).toBe("actions");
    const end = applyAction(ans.state, { t: "endTurn" });
    if (!end.ok) throw new Error(end.error);
    expect(end.state.phase).toBe("handoff");
    expect(end.state.activePlayerIdx).toBe(1);
    expect(end.state.turn).toBe(2);
  });

  it("end-game when all majorities decided", () => {
    let s = freshState();
    s.phase = "actions";
    // Fill every zone with p1 majority (>= req voters, all non-volatile).
    const ZONES = ["nw", "n", "ne", "w", "c", "e", "sw", "s", "se"];
    for (const z of ZONES) {
      const cap = s.zones[z].slots.length;
      // Fill every slot — entirely full → "decided" via fill rule.
      for (let i = 0; i < cap; i++) {
        s.zones[z].slots[i] = { playerId: "p1", isMajority: false };
      }
      recomputeMajorities(s, z);
    }
    const r = applyAction(s, { t: "endTurn" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.phase).toBe("ended");
  });

  it("unplaced voter-card voters discarded at end of turn", () => {
    let s = freshState();
    s.phase = "actions";
    const inf = applyAction(s, {
      t: "influenceVoterCard", openIdx: 0, payment: { funds: 1 },
    });
    if (!inf.ok) throw new Error(inf.error);
    expect(inf.state.pendingPlacements.length).toBe(1);
    const end = applyAction(inf.state, { t: "endTurn" });
    if (!end.ok) throw new Error(end.error);
    // Bundle gone (discarded).
    expect(end.state.pendingPlacements.length).toBe(0);
  });

  it("endTurn blocks if pending headlines unresolved", () => {
    let s = freshState();
    s.phase = "actions";
    s.pendingHeadlines = 1;
    // First endTurn → moves to headlines phase.
    const r1 = applyAction(s, { t: "endTurn" });
    if (!r1.ok) throw new Error(r1.error);
    expect(r1.state.phase).toBe("headlines");
    // endTurn again without resolving → reject.
    const r2 = applyAction(r1.state, { t: "endTurn" });
    expect(r2.ok).toBe(false);
    // Resolve, then endTurn ok.
    const res = applyAction(r1.state, { t: "resolveHeadline", params: {} });
    if (!res.ok) throw new Error(res.error);
    const r3 = applyAction(res.state, { t: "endTurn" });
    expect(r3.ok).toBe(true);
  });

  it("powerUsage resets each turn", () => {
    let s = freshState();
    s.phase = "actions";
    s.powerUsage = { "capitalist.3": 1 };
    const end = applyAction(s, { t: "endTurn" });
    if (!end.ok) throw new Error(end.error);
    expect(end.state.powerUsage).toEqual({});
  });
});
