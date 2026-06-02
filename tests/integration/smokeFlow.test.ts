// End-to-end smoke test: spin up a real game with the actual data files
// (board + cards), then drive several turns via the public reducer to make
// sure the engine, state factory, and data layer all line up. Catches
// integration-level bugs the per-module unit tests can miss.

import { describe, it, expect } from "vitest";
import { createInitialState } from "@/engine/state";
import { applyAction } from "@/engine/reducer";
import { BOARD } from "@/data/board";
import { VOTER_CARDS } from "@/data/cards/voter";
import type { Action, GameState, Resource } from "@/engine/types";

function dispatch(state: GameState, action: Action): GameState {
  const r = applyAction(state, action);
  if (!r.ok) throw new Error(`action ${action.t} failed: ${r.error}`);
  return r.state;
}

describe("integration: smoke flow", () => {
  it("board has 9 zones, ~144 slots, 11 volatile areas", () => {
    expect(BOARD.zones).toHaveLength(9);
    const totalSlots = BOARD.zones.reduce((s, z) => s + z.capacity, 0);
    // Published SHASN board: 4×11 + 4×21 + 16 = 144 hex tiles.
    expect(totalSlots).toBeGreaterThanOrEqual(120);
    expect(totalSlots).toBeLessThanOrEqual(160);
    const totalVolatile = BOARD.zones.reduce((s, z) => s + z.volatileSlotIndices.length, 0);
    expect(totalVolatile).toBe(11);
    // Adjacency is symmetric
    for (const z of BOARD.zones) {
      for (const aid of z.adjacent) {
        const other = BOARD.zones.find((zz) => zz.id === aid);
        expect(other, `adjacent zone ${aid} should exist`).toBeDefined();
        expect(other!.adjacent).toContain(z.id);
      }
    }
  });

  it("starts a 3-player game and exposes an ideology card to draw", () => {
    let state = createInitialState({
      players: [
        { name: "Alice", color: "capitalist" },
        { name: "Bob", color: "supremo" },
        { name: "Carol", color: "idealist" },
      ],
      seed: 42,
    });
    expect(state.players).toHaveLength(3);
    expect(state.phase).toBe("handoff");
    // P1 starts with 1 resource, P2 with 2, P3 with 3 (rulebook setup).
    const totals = state.players.map((p) =>
      Object.values(p.resources).reduce((a, b) => a + b, 0)
    );
    expect(totals).toEqual([1, 2, 3]);
    // Three face-up voter cards are dealt.
    expect(state.openVoterCards.filter((c) => c !== null)).toHaveLength(3);
    expect(state.decks.ideology.length).toBeGreaterThan(0);

    // Advance through the handoff -> ideology -> answer flow.
    state = dispatch(state, { t: "acknowledgeHandoff" });
    expect(state.phase).toBe("ideology");
    expect(state.currentIdeologyCard).not.toBeNull();

    state = dispatch(state, { t: "answerIdeology", side: "left" });
    expect(state.phase).toBe("actions");
    expect(state.players[0].ideologyCards).toHaveLength(1);

    // Player chooses to end turn (no actions taken).
    state = dispatch(state, { t: "endTurn" });
    // Headlines phase only if voters placed in volatile areas; we placed none
    // so we should skip straight back to handoff for the next player.
    expect(["handoff", "headlines"]).toContain(state.phase);
    if (state.phase === "handoff") {
      expect(state.activePlayerIdx).toBe(1);
    }
  });

  it("influences a 1-voter card and places the voter in a zone", () => {
    let state = createInitialState({
      players: [
        { name: "Alice", color: "capitalist" },
        { name: "Bob", color: "supremo" },
      ],
      seed: 7,
    });
    state = dispatch(state, { t: "acknowledgeHandoff" });
    state = dispatch(state, { t: "answerIdeology", side: "left" });
    // Set resources to exactly cover the first open voter card's cost, well
    // under the cap of 12. We look up the card here.
    const card0 = VOTER_CARDS.find((c) => c.id === state.openVoterCards[0])!;
    const startResources: Record<Resource, number> = { funds: 0, clout: 0, media: 0, trust: 0 };
    for (const r of ["funds", "clout", "media", "trust"] as Resource[]) {
      startResources[r] = (card0.cost as Partial<Record<Resource, number>>)[r] ?? 0;
    }
    const anyNeeded = (card0.cost as { any?: number }).any ?? 0;
    startResources.funds += anyNeeded; // pay `any` cost in funds
    state.players[0].resources = startResources;
    expect(state.phase).toBe("actions");

    // Influence the first open voter card. Pay its exact cost: each fixed
    // resource at its listed amount, plus any `any:` portion paid in funds.
    const openIdx = 0 as 0 | 1 | 2;
    const cardId = state.openVoterCards[openIdx]!;
    const card = VOTER_CARDS.find((c) => c.id === cardId)!;
    const payment: Partial<Record<Resource, number>> = {};
    for (const r of ["funds", "clout", "media", "trust"] as Resource[]) {
      const amt = (card.cost as Partial<Record<Resource, number>>)[r];
      if (amt) payment[r] = amt;
    }
    const anyAmt = (card.cost as { any?: number }).any ?? 0;
    if (anyAmt > 0) payment.funds = (payment.funds ?? 0) + anyAmt;

    const r = applyAction(state, { t: "influenceVoterCard", openIdx, payment });
    expect(r.ok, r.ok ? "" : (r as { error: string }).error).toBe(true);
    if (!r.ok) return;
    state = r.state;
    expect(state.pendingPlacements.length).toBeGreaterThan(0);

    // Place all pending voters into the first zone with a free slot.
    while (state.pendingPlacements.length > 0) {
      const bundle = state.pendingPlacements[0];
      // Find a non-volatile free slot in zone "nw".
      const zoneState = state.zones["nw"];
      let placed = false;
      for (let i = 0; i < zoneState.slots.length; i++) {
        if (zoneState.slots[i] === null) {
          const r = applyAction(state, {
            t: "placeVoter",
            zoneId: "nw",
            slotIdx: i,
            pendingIdx: 0,
          });
          if (r.ok) {
            state = r.state;
            placed = true;
            break;
          }
        }
      }
      // If we couldn't place (e.g. committed to a different zone), give up
      // gracefully — the placement bundle's committedZoneId is set after the
      // first placement.
      if (!placed) break;
      if (state.pendingPlacements.length === bundle.voters.length) break;
    }

    // At least one of P1's voters should now be on the board somewhere.
    const p1OnBoard = Object.values(state.zones).reduce(
      (sum, z) => sum + z.slots.filter((s) => s?.playerId === "p1").length,
      0
    );
    expect(p1OnBoard).toBeGreaterThan(0);
  });
});
