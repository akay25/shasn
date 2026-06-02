// Majority formation/breaking. Must be called after every voter mutation
// (placement, eviction, conversion, gerrymander, discard, donation).
import type { GameState, ZoneState, PlayerId } from "@/engine/types";
import { getZone } from "@/data/board";
import { voterCountInZone } from "@/engine/selectors";

/**
 * Recompute the majority status of a single zone. Mutates the zone in place.
 *
 * Rules:
 *  - If a player has >= majorityRequirement voters in the zone and no one
 *    else also does (defensive — typically only one player can hold a
 *    majority because the threshold is > half), set majorityHolder and
 *    flip exactly `majorityRequirement` of their voters to isMajority=true.
 *  - If the current holder no longer meets the requirement, clear holder
 *    and flip all their voters in the zone back to non-majority.
 */
export function recomputeMajorities(state: GameState, zoneId: string): void {
  const zoneDef = getZone(state.board, zoneId);
  const z = state.zones[zoneId];
  if (!z) return;

  // Find a player meeting the threshold (there can be at most one because
  // majorityRequirement > capacity/2).
  const counts = new Map<PlayerId, number>();
  for (const slot of z.slots) {
    if (slot) counts.set(slot.playerId, (counts.get(slot.playerId) ?? 0) + 1);
  }

  let qualifier: PlayerId | null = null;
  for (const [pid, n] of counts) {
    if (n >= zoneDef.majorityRequirement) {
      qualifier = pid;
      break;
    }
  }

  if (qualifier) {
    // Form / maintain majority for qualifier.
    if (z.majorityHolder && z.majorityHolder !== qualifier) {
      // Edge case (shouldn't happen): break previous holder's majority first.
      flipPlayerVoters(z, z.majorityHolder, false);
    }
    z.majorityHolder = qualifier;
    // Flip exactly majorityRequirement of qualifier's voters to majority.
    // Per rulebook: "flip over as many voters as were required to form
    // the majority". Extra voters above the requirement remain blank.
    let toFlip = zoneDef.majorityRequirement;
    // First, count any of qualifier's voters already flipped — keep them.
    // We want exactly `requirement` flipped if possible.
    // Strategy: walk slots, flip qualifier's voters until we hit the count,
    // then flip remaining qualifier's voters back to non-majority.
    for (let i = 0; i < z.slots.length; i++) {
      const slot = z.slots[i];
      if (!slot || slot.playerId !== qualifier) continue;
      if (toFlip > 0) {
        slot.isMajority = true;
        toFlip--;
      } else {
        slot.isMajority = false;
      }
    }
  } else {
    // No one qualifies — break any existing majority.
    if (z.majorityHolder) {
      flipPlayerVoters(z, z.majorityHolder, false);
      z.majorityHolder = null;
    } else {
      // Defensive: clear any stray isMajority=true flags.
      for (const slot of z.slots) {
        if (slot && slot.isMajority) slot.isMajority = false;
      }
    }
  }
}

function flipPlayerVoters(z: ZoneState, pid: PlayerId, on: boolean): void {
  for (const slot of z.slots) {
    if (slot && slot.playerId === pid) slot.isMajority = on;
  }
}

/** Sanity helper: recompute all zones. */
export function recomputeAll(state: GameState): void {
  for (const zid of Object.keys(state.zones)) {
    recomputeMajorities(state, zid);
  }
}
