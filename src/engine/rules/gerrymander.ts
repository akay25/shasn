// Gerrymandering: holder of strict-most-voters in a zone may move one
// non-majority voter (of any owner), once per turn per zone, either
// in/out of the zone or between two adjacent zones (including the zone
// itself + adjacent).
import type { GameState, ActionResult, PlayerId } from "@/engine/types";
import {
  activePlayer,
  gerrymanderingRightsHolder,
  isVolatileSlot,
  voterCountInZone,
  ideologueCardCount,
} from "@/engine/selectors";
import { deepClone, logEvent } from "@/engine/reducer";
import { recomputeMajorities } from "./majorities";

/**
 * Apply a gerrymander action.
 *
 * Constraints:
 *   - phase = actions
 *   - Active player must hold Gerrymandering Rights in either fromZone or
 *     toZone (the "controlled" zone), AND the other zone must be adjacent
 *     to the controlled zone (or equal to it — i.e. internal shuffle).
 *   - Source voter must exist and not be a majority voter.
 *   - Source voter must not be in a volatile area.
 *   - Target slot must be empty and not a volatile area (placing into a
 *     volatile area via gerrymander is OK by rulebook — placing a voter
 *     in a Volatile Area triggers a Headline regardless of mechanism;
 *     but a voter MOVED into a volatile slot isn't "placed" in the strict
 *     rulebook sense. We choose the lenient interpretation: gerrymander
 *     into a volatile slot IS allowed and triggers a Headline.)
 *   - If source voter is the active player's only voter in a zone they
 *     would otherwise have rights in, you cannot move it out of that zone.
 *   - Per-zone usage cap of 1 per turn (or 2 if Showstopper L5 active).
 */
export function applyGerrymander(
  state: GameState,
  fromZone: string,
  fromSlotIdx: number,
  toZone: string,
  toSlotIdx: number,
): ActionResult {
  if (state.phase !== "actions") {
    return { ok: false, error: `Cannot gerrymander in phase ${state.phase}` };
  }
  if (overCap(state)) {
    return { ok: false, error: "Resource cap exceeded — discard first" };
  }
  const fromDef = state.board.zones.find((z) => z.id === fromZone);
  const toDef = state.board.zones.find((z) => z.id === toZone);
  if (!fromDef || !toDef) return { ok: false, error: "Unknown zone" };
  const fz = state.zones[fromZone];
  const tz = state.zones[toZone];
  if (!fz || !tz) return { ok: false, error: "Unknown zone state" };

  // Determine which zone the active player has Gerrymandering Rights in,
  // and confirm the other zone is adjacent to it (or equal).
  const active = activePlayer(state).id;
  const fromHolder = gerrymanderingRightsHolder(state, fromZone);
  const toHolder = gerrymanderingRightsHolder(state, toZone);

  let controlledZone: string | null = null;
  let otherZone: string | null = null;
  if (fromHolder === active) {
    controlledZone = fromZone;
    otherZone = toZone;
  } else if (toHolder === active) {
    controlledZone = toZone;
    otherZone = fromZone;
  } else {
    return { ok: false, error: "Active player has no Gerrymandering Rights in either zone" };
  }
  // Other zone must be controlled zone itself or adjacent to it.
  if (otherZone !== controlledZone) {
    const ctrlDef = controlledZone === fromZone ? fromDef : toDef;
    if (!ctrlDef.adjacent.includes(otherZone)) {
      return { ok: false, error: `Zone ${otherZone} not adjacent to controlled zone ${controlledZone}` };
    }
  }

  // Validate source voter.
  if (fromSlotIdx < 0 || fromSlotIdx >= fz.slots.length) {
    return { ok: false, error: "Invalid fromSlotIdx" };
  }
  const sourceVoter = fz.slots[fromSlotIdx];
  if (!sourceVoter) return { ok: false, error: "No voter at source slot" };
  if (sourceVoter.isMajority) return { ok: false, error: "Cannot gerrymander a majority voter" };
  if (isVolatileSlot(state, fromZone, fromSlotIdx)) {
    return { ok: false, error: "Voters in Volatile Areas cannot be gerrymandered" };
  }

  // Validate target slot.
  if (toSlotIdx < 0 || toSlotIdx >= tz.slots.length) {
    return { ok: false, error: "Invalid toSlotIdx" };
  }
  if (fromZone === toZone && fromSlotIdx === toSlotIdx) {
    return { ok: false, error: "Cannot move voter to its own slot" };
  }
  if (tz.slots[toSlotIdx] !== null) {
    return { ok: false, error: "Target slot occupied" };
  }

  // Sole-voter-in-controlled-zone restriction: if the source voter
  // belongs to the active player, is in the controlled zone, and is
  // their ONLY voter in that zone, they cannot move it OUT of that zone
  // (because doing so would forfeit rights mid-move).
  if (
    controlledZone === fromZone &&
    sourceVoter.playerId === active &&
    voterCountInZone(fz, active) === 1 &&
    fromZone !== toZone
  ) {
    return {
      ok: false,
      error: "Cannot move your only voter out of a zone where you have Gerrymandering Rights",
    };
  }

  // Per-zone-per-turn usage cap. Showstopper L5 ("Election Fever") allows
  // 2 voters per zone where the player has rights. We just count uses
  // against the *controlled* zone.
  const showstopperL5 =
    ideologueCardCount(state.players[state.activePlayerIdx], "showstopper") >= 5;
  const usageKey = `gerrymander.${controlledZone}`;
  const usedThisTurn = state.powerUsage[usageKey] ?? 0;
  const maxPerZone = showstopperL5 ? 2 : 1;
  if (usedThisTurn >= maxPerZone) {
    return {
      ok: false,
      error: `Already gerrymandered ${usedThisTurn}/${maxPerZone} times in zone ${controlledZone} this turn`,
    };
  }

  // Mutate.
  const next = deepClone(state);
  const fzN = next.zones[fromZone];
  const tzN = next.zones[toZone];
  const voter = fzN.slots[fromSlotIdx]!;
  fzN.slots[fromSlotIdx] = null;
  tzN.slots[toSlotIdx] = { playerId: voter.playerId, isMajority: false };

  next.powerUsage[usageKey] = usedThisTurn + 1;

  // Volatile-area trigger if target is volatile.
  if (isVolatileSlot(next, toZone, toSlotIdx)) {
    next.pendingHeadlines += 1;
    logEvent(next, "volatileTriggered", { zoneId: toZone, slotIdx: toSlotIdx });
  }

  // Recompute majorities in BOTH zones.
  recomputeMajorities(next, fromZone);
  if (fromZone !== toZone) recomputeMajorities(next, toZone);

  logEvent(next, "gerrymandered", {
    fromZone, fromSlotIdx, toZone, toSlotIdx,
    voterOwner: voter.playerId,
    controlledBy: active,
  });
  return { ok: true, state: next };
}

// ---- Helpers ----
function overCap(state: GameState): boolean {
  const p = state.players[state.activePlayerIdx];
  return p.resources.funds + p.resources.clout + p.resources.media + p.resources.trust > p.resourceCap;
}

