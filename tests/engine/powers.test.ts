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

function grantIdeologyCards(s: ReturnType<typeof freshState>, prefix: string, n: number): void {
  for (let i = 0; i < n; i++) {
    s.players[0].ideologyCards.push({ cardId: `${prefix}-${i}`, side: "left" });
  }
}

describe("powers", () => {
  it("rejects use of locked power", () => {
    let s = freshState();
    s.phase = "actions";
    // No ideology cards yet.
    const r = applyAction(s, {
      t: "useIdeologuePower", ideologue: "capitalist", level: 3, params: {},
    });
    expect(r.ok).toBe(false);
  });

  it("Capitalist L3 Prospecting: pay 1 → take 2", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "cap", 3); // L3 unlocked
    const r = applyAction(s, {
      t: "useIdeologuePower",
      ideologue: "capitalist", level: 3,
      params: { payResource: "funds", take: { clout: 1, media: 1 } },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // Started at 2/2/2/2. Paid 1 funds, gained 1 clout + 1 media.
    expect(r.state.players[0].resources.funds).toBe(1);
    expect(r.state.players[0].resources.clout).toBe(3);
    expect(r.state.players[0].resources.media).toBe(3);
  });

  it("Capitalist L3 cap: 1 use per turn", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "cap", 3);
    const r1 = applyAction(s, {
      t: "useIdeologuePower",
      ideologue: "capitalist", level: 3,
      params: { payResource: "funds", take: { clout: 2 } },
    });
    if (!r1.ok) throw new Error(r1.error);
    const r2 = applyAction(r1.state, {
      t: "useIdeologuePower",
      ideologue: "capitalist", level: 3,
      params: { payResource: "funds", take: { clout: 2 } },
    });
    expect(r2.ok).toBe(false);
  });

  it("Capitalist L5 Land Grab: evicts a voter (incl majority); 3 uses/turn", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "cap", 5);
    placeVoters(s, "n", "p2", 5);
    recomputeMajorities(s, "n");
    // p2 has majority. Evict slot 0 (majority voter).
    const r = applyAction(s, {
      t: "useIdeologuePower",
      ideologue: "capitalist", level: 5,
      params: { zoneId: "n", slotIdx: 0 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.zones.n.slots[0]).toBeNull();
    // Evicted voter is pending for p2.
    expect(r.state.pendingPlacements.length).toBe(1);
    expect(r.state.pendingPlacements[0].source).toBe("evicted");
    expect(r.state.pendingPlacements[0].voters[0]).toBe("p2");
  });

  it("Capitalist L5 cap: 3 uses/turn", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "cap", 5);
    // Use "nw" (capacity 9, volatile slot 4). Place p2 in slots 0,1,2,3.
    placeVoters(s, "nw", "p2", 5);
    let st = s;
    // Evict slots 0, 1, 2 (all non-volatile).
    const indices = [0, 1, 2];
    for (const i of indices) {
      const r = applyAction(st, {
        t: "useIdeologuePower", ideologue: "capitalist", level: 5,
        params: { zoneId: "nw", slotIdx: i },
      });
      if (!r.ok) throw new Error(`use ${i}: ${r.error}`);
      st = r.state;
    }
    const over = applyAction(st, {
      t: "useIdeologuePower", ideologue: "capitalist", level: 5,
      params: { zoneId: "nw", slotIdx: 3 },
    });
    expect(over.ok).toBe(false);
  });

  it("Supremo L3 Donations: snatch from another player; 2 uses/turn", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "sup", 3);
    const r1 = applyAction(s, {
      t: "useIdeologuePower", ideologue: "supremo", level: 3,
      params: { targetPlayerId: "p2", resource: "funds" },
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.state.players[1].resources.funds).toBe(1);
    expect(r1.state.players[0].resources.funds).toBe(3);
    const r2 = applyAction(r1.state, {
      t: "useIdeologuePower", ideologue: "supremo", level: 3,
      params: { targetPlayerId: "p2", resource: "clout" },
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    const r3 = applyAction(r2.state, {
      t: "useIdeologuePower", ideologue: "supremo", level: 3,
      params: { targetPlayerId: "p2", resource: "media" },
    });
    expect(r3.ok).toBe(false);
  });

  it("Supremo L5 Payback: pay 1 to discard opponent voter; 2 uses/turn", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "sup", 5);
    placeVoters(s, "n", "p2", 1);
    const r = applyAction(s, {
      t: "useIdeologuePower", ideologue: "supremo", level: 5,
      params: { payResource: "funds", zoneId: "n", slotIdx: 0 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.zones.n.slots[0]).toBeNull();
    expect(r.state.players[0].resources.funds).toBe(1);
  });

  it("Showstopper L3 Going Viral: +1 voter on next influenced card", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "sho", 3);
    const r = applyAction(s, {
      t: "useIdeologuePower", ideologue: "showstopper", level: 3, params: {},
    });
    if (!r.ok) throw new Error(r.error);
    const inf = applyAction(r.state, {
      t: "influenceVoterCard", openIdx: 0, payment: { funds: 1 },
    });
    if (!inf.ok) throw new Error(inf.error);
    // Bundle should have 2 voters (1 from card + 1 viral).
    expect(inf.state.pendingPlacements[0].voters.length).toBe(2);
  });

  it("Idealist L3 Helping Hands: -1 discount on voter card", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "ide", 3);
    const r = applyAction(s, {
      t: "useIdeologuePower", ideologue: "idealist", level: 3, params: {},
    });
    if (!r.ok) throw new Error(r.error);
    // v1-a costs 1 funds. With -1 discount we pay 0.
    const inf = applyAction(r.state, {
      t: "influenceVoterCard", openIdx: 0, payment: {},
    });
    expect(inf.ok).toBe(true);
    if (!inf.ok) return;
    expect(inf.state.players[0].resources.funds).toBe(2); // unchanged from start
  });

  it("Idealist L5 Tough Love: convert 2 opponent voters in same zone", () => {
    let s = freshState();
    s.phase = "actions";
    grantIdeologyCards(s, "ide", 5);
    // Need enough resources: 2 trust + 2 of anything. Use nw (no volatile in 0,1).
    s.players[0].resources = { funds: 3, clout: 0, media: 0, trust: 3 };
    s.players[0].resourceCap = 12;
    placeVoters(s, "nw", "p2", 2); // slots 0,1 (volatile is index 4)
    const r = applyAction(s, {
      t: "useIdeologuePower", ideologue: "idealist", level: 5,
      params: {
        zoneId: "nw", targetPlayerId: "p2", slotIndices: [0, 1],
        anyPayment: { trust: 2, funds: 2 }, // 2 trust + 2 any (here funds)
      },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.zones.nw.slots[0]?.playerId).toBe("p1");
    expect(r.state.zones.nw.slots[1]?.playerId).toBe("p1");
    expect(r.state.players[0].resources.trust).toBe(1);
    expect(r.state.players[0].resources.funds).toBe(1);
  });
});
