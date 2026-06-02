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

describe("gerrymander", () => {
  it("happy path: move a non-majority voter within a zone", () => {
    let s = freshState();
    s.phase = "actions";
    placeVoters(s, "n", "p1", 2); // slots 0,1
    // p1 has rights in "n".
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "n", toSlotIdx: 5,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.zones.n.slots[0]).toBeNull();
    expect(r.state.zones.n.slots[5]).toMatchObject({ playerId: "p1" });
  });

  it("happy path: move to adjacent zone", () => {
    let s = freshState();
    s.phase = "actions";
    placeVoters(s, "n", "p1", 2);
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "c", toSlotIdx: 0,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects move to non-adjacent zone", () => {
    let s = freshState();
    s.phase = "actions";
    placeVoters(s, "n", "p1", 2);
    // n is NOT adjacent to s in board (adjacent are nw, ne, c).
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "s", toSlotIdx: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects moving a majority voter", () => {
    let s = freshState();
    s.phase = "actions";
    // n: capacity 21, threshold 11. Place threshold-many of p1.
    placeVoters(s, "n", "p1", 11);
    recomputeMajorities(s, "n");
    // p1 has rights (and majority). Try to move slot 0 (majority voter).
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "n", toSlotIdx: 15,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects moving a voter in a Volatile Area", () => {
    let s = freshState();
    s.phase = "actions";
    // n's volatile slots are [4, 16]. Place a voter in slot 4 (volatile).
    s.zones.n.slots[4] = { playerId: "p1", isMajority: false };
    s.zones.n.slots[0] = { playerId: "p1", isMajority: false };
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 4, toZone: "n", toSlotIdx: 5,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects when no rights (tie)", () => {
    let s = freshState();
    s.phase = "actions";
    placeVoters(s, "n", "p1", 2);
    placeVoters(s, "n", "p2", 2); // tied → no rights
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "n", toSlotIdx: 5,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects moving sole voter out of controlled zone", () => {
    let s = freshState();
    s.phase = "actions";
    s.zones.n.slots[0] = { playerId: "p1", isMajority: false };
    // p1 has 1 voter; rights. Moving out of "n" → forfeits rights mid-move.
    const r = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "c", toSlotIdx: 0,
    });
    expect(r.ok).toBe(false);
  });

  it("enforces 1-use-per-zone-per-turn cap", () => {
    let s = freshState();
    s.phase = "actions";
    placeVoters(s, "n", "p1", 3);
    const r1 = applyAction(s, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 0, toZone: "n", toSlotIdx: 6,
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = applyAction(r1.state, {
      t: "gerrymander", fromZone: "n", fromSlotIdx: 1, toZone: "n", toSlotIdx: 7,
    });
    expect(r2.ok).toBe(false);
  });
});
