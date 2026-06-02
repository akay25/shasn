// End-of-turn placement enforcement and helpers.
//
// Rulebook references:
//   - "If there aren't enough empty areas left in any one zone to place
//     the influenced voters from a single Voter Card, all voters from
//     that card get discarded."
//   - "Any influenced voters must be placed on the board by the end of
//     the same turn. Failure to do so will lead to these voters being
//     discarded." (This applies to `voterCard`-source bundles. For other
//     sources — evicted/donated/chaos — voters carry over per rulebook
//     evict rule: an evicted voter can be placed in the player's NEXT
//     turn; failing to place THAT turn discards them.)
import type { GameState } from "@/engine/types";
import { emptySlotsInZone } from "@/engine/selectors";
import { logEvent } from "@/engine/reducer";

/** Discard any pending voter-card bundles that cannot fit in any single
 *  zone. Mutates state. Returns the number of bundles discarded. */
export function discardUnplaceableBundles(state: GameState): number {
  let discarded = 0;
  state.pendingPlacements = state.pendingPlacements.filter((pp) => {
    if (pp.source !== "voterCard") return true;
    // Check whether any zone has enough empty slots for the whole bundle.
    let canFit = false;
    for (const z of state.board.zones) {
      if (emptySlotsInZone(state.zones[z.id]) >= pp.voters.length) {
        canFit = true;
        break;
      }
    }
    if (!canFit) {
      logEvent(state, "voterCardDiscarded_noFit", {
        cardId: pp.voterCardId,
        voters: pp.voters.length,
      });
      discarded += 1;
      return false;
    }
    return true;
  });
  return discarded;
}

/** Discard ALL remaining `voterCard`-source pending placements (called at
 *  end of turn — voter-card voters that weren't placed are discarded).
 *  Returns the number of voters discarded. */
export function discardUnplacedVoterCardVoters(state: GameState): number {
  let discarded = 0;
  state.pendingPlacements = state.pendingPlacements.filter((pp) => {
    if (pp.source !== "voterCard") return true;
    if (pp.voters.length === 0) return false;
    discarded += pp.voters.length;
    logEvent(state, "voterCardVotersDiscarded", {
      cardId: pp.voterCardId,
      voters: pp.voters.length,
    });
    return false;
  });
  return discarded;
}
