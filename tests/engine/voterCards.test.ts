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
import { discardUnplaceableBundles } from "@/engine/rules/placement";

describe("voter cards: influence + place", () => {
  it("happy path: 1-voter card → influence, place", () => {
    let s = freshState();
    s.phase = "actions";
    // v1-a costs { funds: 1 }; open at slot 0.
    const inf = applyAction(s, {
      t: "influenceVoterCard",
      openIdx: 0,
      payment: { funds: 1 },
    });
    expect(inf.ok).toBe(true);
    if (!inf.ok) return;
    expect(inf.state.players[0].resources.funds).toBe(1);
    expect(inf.state.pendingPlacements.length).toBe(1);
    expect(inf.state.pendingPlacements[0].voters.length).toBe(1);

    // Place it in zone "n" slot 0.
    const pl = applyAction(inf.state, {
      t: "placeVoter", zoneId: "n", slotIdx: 0, pendingIdx: 0,
    });
    expect(pl.ok).toBe(true);
    if (!pl.ok) return;
    expect(pl.state.pendingPlacements.length).toBe(0);
    expect(pl.state.zones.n.slots[0]).toMatchObject({ playerId: "p1", isMajority: false });
  });

  it("rejects payment short", () => {
    let s = freshState();
    s.phase = "actions";
    const inf = applyAction(s, {
      t: "influenceVoterCard", openIdx: 0, payment: { clout: 1 }, // wrong type
    });
    expect(inf.ok).toBe(false);
  });

  it("'any' cost: v3-a costs any 3 — accepts mixed payment", () => {
    let s = freshState();
    s.phase = "actions";
    // Put v3-a at slot 0.
    s.openVoterCards[0] = "v3-a";
    const inf = applyAction(s, {
      t: "influenceVoterCard",
      openIdx: 0,
      payment: { funds: 1, clout: 1, media: 1 },
    });
    expect(inf.ok).toBe(true);
    if (!inf.ok) return;
    expect(inf.state.pendingPlacements[0].voters.length).toBe(3);
  });

  it("voter-card bundle: all voters must go to one zone", () => {
    let s = freshState();
    s.phase = "actions";
    s.openVoterCards[0] = "v3-a";
    const inf = applyAction(s, {
      t: "influenceVoterCard",
      openIdx: 0,
      payment: { funds: 1, clout: 1, media: 1 },
    });
    if (!inf.ok) throw new Error(inf.error);
    let st = inf.state;
    // Place 1 in n slot 0. Should succeed.
    let p = applyAction(st, { t: "placeVoter", zoneId: "n", slotIdx: 0, pendingIdx: 0 });
    if (!p.ok) throw new Error(p.error);
    st = p.state;
    // Bundle is now committed to zone "n"; placing in another zone should fail.
    const reject = applyAction(st, { t: "placeVoter", zoneId: "s", slotIdx: 0, pendingIdx: 0 });
    expect(reject.ok).toBe(false);
    // Continuing to place in n works.
    const cont = applyAction(st, { t: "placeVoter", zoneId: "n", slotIdx: 1, pendingIdx: 0 });
    expect(cont.ok).toBe(true);
  });
});

describe("voter cards: 3-voter unplaceable → discarded", () => {
  it("3-voter card with no zone large enough is discarded at turn end", () => {
    let s = freshState();
    s.phase = "actions";
    // Fill every zone leaving only 2 empty slots in each.
    for (const zid of Object.keys(s.zones)) {
      const z = s.zones[zid];
      // Fill all but 2.
      for (let i = 0; i < z.slots.length - 2; i++) {
        z.slots[i] = { playerId: "p2", isMajority: false };
      }
    }
    s.openVoterCards[0] = "v3-a";
    const inf = applyAction(s, {
      t: "influenceVoterCard",
      openIdx: 0,
      payment: { funds: 1, clout: 1, media: 1 },
    });
    if (!inf.ok) throw new Error(inf.error);
    // Bundle has 3 voters but no zone has 3 empty slots. discardUnplaceableBundles should remove.
    const n = discardUnplaceableBundles(inf.state);
    expect(n).toBe(1);
    expect(inf.state.pendingPlacements.length).toBe(0);
  });
});

describe("resource cap discard", () => {
  it("over-cap blocks actions until discardResources brings it back", () => {
    let s = freshState();
    s.phase = "actions";
    // Push player 0 over cap.
    s.players[0].resources = { funds: 10, clout: 5, media: 0, trust: 0 };
    const blocked = applyAction(s, {
      t: "influenceVoterCard", openIdx: 0, payment: { funds: 1 },
    });
    expect(blocked.ok).toBe(false);
    // Discard 3 funds → total = 12 (cap).
    const disc = applyAction(s, { t: "discardResources", discards: { funds: 3 } });
    expect(disc.ok).toBe(true);
    if (!disc.ok) return;
    const ok = applyAction(disc.state, {
      t: "influenceVoterCard", openIdx: 0, payment: { funds: 1 },
    });
    expect(ok.ok).toBe(true);
  });
});
