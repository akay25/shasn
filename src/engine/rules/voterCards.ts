// Voter Card influence + placement.
import type {
  GameState,
  ActionResult,
  Resource,
  PendingPlacement,
  VoterCard,
  PlayerId,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { VOTER_CARDS } from "@/data/cards/voter";
import { shuffle } from "@/engine/rng";
import { getZone } from "@/data/board";
import {
  emptySlotsInZone,
  isVolatileSlot,
} from "@/engine/selectors";
import {
  deepClone,
  logEvent,
  subResources,
  totalAmount,
} from "@/engine/reducer";
import { recomputeMajorities } from "./majorities";

export function lookupVoterCard(id: string): VoterCard | undefined {
  return VOTER_CARDS.find((c) => c.id === id);
}

/** Influence a voter card from one of the 3 open slots. Pay the card's
 *  cost (with `any` paid via `payment`). Queues voters as pending. */
export function applyInfluenceVoterCard(
  state: GameState,
  openIdx: 0 | 1 | 2,
  payment: Partial<Record<Resource, number>>,
): ActionResult {
  if (state.phase !== "actions") {
    return { ok: false, error: `Cannot influence in phase ${state.phase}` };
  }
  if (overCap(state)) return { ok: false, error: "Resource cap exceeded — discard first" };

  const cardId = state.openVoterCards[openIdx];
  if (!cardId) return { ok: false, error: `No voter card in slot ${openIdx}` };
  const card = lookupVoterCard(cardId);
  if (!card) return { ok: false, error: "Unknown voter card id" };

  // Apply Idealist L3 discount if claimed via powerUsage marker:
  // The reducer handles this via a dedicated power action that decrements
  // the cost; in this handler we simply trust the `payment` figure equals
  // (or exceeds via discount) the card cost minus any active discount.
  // We compute the *effective* cost = card cost minus pending discount.
  const next = deepClone(state);
  const np = next.players[next.activePlayerIdx];

  const discountKey = `idealist.3.discountPending`;
  const discount = next.powerUsage[discountKey] ?? 0;
  // Validate payment covers cost.
  const validation = validatePayment(card, payment, discount);
  if (!validation.ok) return { ok: false, error: validation.error };
  const usedDiscount = validation.usedDiscount;

  // Deduct payment from player.
  const sub = subResources(np.resources, payment);
  if (!sub.ok) return { ok: false, error: sub.error };

  // Consume discount.
  if (usedDiscount > 0) {
    next.powerUsage[discountKey] = (next.powerUsage[discountKey] ?? 0) - usedDiscount;
    if (next.powerUsage[discountKey]! <= 0) delete next.powerUsage[discountKey];
  }

  // Determine voters to queue (Showstopper L3 "Going Viral": +1 voter on
  // this card if a Going Viral charge is pending).
  let voters = card.voters as number;
  const viralKey = `showstopper.3.pending`;
  if ((next.powerUsage[viralKey] ?? 0) > 0) {
    voters += 1;
    next.powerUsage[viralKey] = (next.powerUsage[viralKey] ?? 0) - 1;
    if (next.powerUsage[viralKey]! <= 0) delete next.powerUsage[viralKey];
  }

  // Discard this card and flip a new one from the deck.
  next.decks.voterDiscard.push(cardId);
  next.openVoterCards[openIdx] = drawNextVoter(next);

  // Queue pending placement bundle. Voters from a single Voter Card MUST
  // go into one zone, so they share a single PendingPlacement record.
  const placement: PendingPlacement = {
    voters: Array.from({ length: voters }, () => np.id),
    source: "voterCard",
    voterCardId: card.id,
  };
  next.pendingPlacements.push(placement);

  logEvent(next, "voterCardInfluenced", {
    cardId: card.id,
    voters,
    cost: payment,
  });
  return { ok: true, state: next };
}

/** Place a single pending voter into a zone slot.
 *
 *  For `voterCard` source placements: all voters in that bundle must end
 *  up in the SAME zone. If the chosen zone cannot fit all remaining
 *  voters from the bundle, the placement is rejected. The engine then
 *  also implements the rulebook's "3-voter card discarded if it can't
 *  fit" rule via `discardUnplaceableVoterCard` at end of turn.
 */
export function applyPlaceVoter(
  state: GameState,
  zoneId: string,
  slotIdx: number,
  pendingIdx: number,
): ActionResult {
  if (state.phase !== "actions" && state.phase !== "headlines") {
    return { ok: false, error: `Cannot place voter in phase ${state.phase}` };
  }
  if (state.phase === "actions" && overCap(state)) {
    return { ok: false, error: "Resource cap exceeded — discard first" };
  }
  const pp = state.pendingPlacements[pendingIdx];
  if (!pp) return { ok: false, error: `No pending placement at index ${pendingIdx}` };
  if (pp.voters.length === 0) return { ok: false, error: "Pending bundle empty" };

  const zoneDef = getZone(state.board, zoneId);
  const zone = state.zones[zoneId];
  if (!zone) return { ok: false, error: `Unknown zone ${zoneId}` };
  if (slotIdx < 0 || slotIdx >= zone.slots.length) {
    return { ok: false, error: `Invalid slot ${slotIdx} in zone ${zoneId}` };
  }
  if (zone.slots[slotIdx] !== null) {
    return { ok: false, error: `Slot ${slotIdx} in zone ${zoneId} occupied` };
  }

  // Voter-card constraint: all voters must end up in one zone.
  if (pp.source === "voterCard" && pp.voterCardId) {
    // If the bundle has already been committed to a zone (i.e. one or
    // more voters from it placed already), require the same zone.
    if (pp.committedZoneId && pp.committedZoneId !== zoneId) {
      return {
        ok: false,
        error: `Voter card ${pp.voterCardId} committed to zone ${pp.committedZoneId}; cannot split into ${zoneId}`,
      };
    }
    // Also require the chosen zone has enough empties for all remaining.
    const empty = emptySlotsInZone(zone);
    if (empty < pp.voters.length) {
      return {
        ok: false,
        error: `Voter card bundle requires ${pp.voters.length} empty slots in one zone, but zone ${zoneId} has only ${empty}`,
      };
    }
  }

  const next = deepClone(state);
  const npp = next.pendingPlacements[pendingIdx];
  const owner = npp.voters.splice(0, 1)[0];
  const targetZone = next.zones[zoneId];
  targetZone.slots[slotIdx] = { playerId: owner, isMajority: false };
  // Commit the bundle to this zone (idempotent if already set).
  if (npp.source === "voterCard") npp.committedZoneId = zoneId;

  // Volatile area → queue a headline.
  if (isVolatileSlot(next, zoneId, slotIdx)) {
    next.pendingHeadlines += 1;
    logEvent(next, "volatileTriggered", { zoneId, slotIdx });
  }

  // Recompute majority.
  recomputeMajorities(next, zoneId);

  // Clean up exhausted pending bundles.
  if (next.pendingPlacements[pendingIdx].voters.length === 0) {
    next.pendingPlacements.splice(pendingIdx, 1);
  }

  logEvent(next, "voterPlaced", { zoneId, slotIdx, playerId: owner });
  return { ok: true, state: next };
}

/** Helper: draw next open voter card. Reshuffles discard if empty.
 *  Returns the new top card id (or null if no cards remain). */
export function drawNextVoter(state: GameState): string | null {
  if (state.decks.voter.length === 0) {
    if (state.decks.voterDiscard.length === 0) return null;
    const { shuffled, nextSeed } = shuffle(state.decks.voterDiscard, state.rngSeed);
    state.decks.voter = shuffled;
    state.decks.voterDiscard = [];
    state.rngSeed = nextSeed;
  }
  return state.decks.voter.shift() ?? null;
}

function overCap(state: GameState): boolean {
  const p = state.players[state.activePlayerIdx];
  let total = 0;
  for (const r of RESOURCES) total += p.resources[r];
  return total > p.resourceCap;
}

interface PaymentValidation { ok: true; usedDiscount: number; }
interface PaymentInvalid    { ok: false; error: string; }

function validatePayment(
  card: VoterCard,
  payment: Partial<Record<Resource, number>>,
  discount: number,
): PaymentValidation | PaymentInvalid {
  // Compute total cost; specific resource buckets must be at least the
  // amounts the card requires (after subtracting discount which the player
  // may direct at any resource). `any` can be paid with any resource.
  const need: Partial<Record<Resource, number>> = {};
  for (const r of RESOURCES) {
    if (card.cost[r]) need[r] = card.cost[r];
  }
  const anyNeed = card.cost.any ?? 0;

  // Apply discount: player chooses how to allocate up to `discount` across
  // resource costs. For simplicity we try to maximize discount usage by
  // applying it first to specific costs, then to `any`.
  let remDiscount = discount;
  let usedDiscount = 0;
  for (const r of RESOURCES) {
    if (remDiscount <= 0) break;
    const n = need[r] ?? 0;
    const apply = Math.min(n, remDiscount);
    if (apply > 0) {
      need[r] = n - apply;
      remDiscount -= apply;
      usedDiscount += apply;
    }
  }
  let anyRemain = anyNeed;
  if (remDiscount > 0 && anyRemain > 0) {
    const apply = Math.min(anyRemain, remDiscount);
    anyRemain -= apply;
    remDiscount -= apply;
    usedDiscount += apply;
  }

  // Now check the payment covers `need` exactly for typed resources and
  // covers the remaining `any` from total leftover.
  let extraForAny = 0;
  for (const r of RESOURCES) {
    const have = payment[r] ?? 0;
    const want = need[r] ?? 0;
    if (have < want) return { ok: false, error: `Payment short on ${r} (need ${want}, paid ${have})` };
    extraForAny += have - want;
  }
  if (extraForAny < anyRemain) {
    return { ok: false, error: `Payment short by ${anyRemain - extraForAny} on 'any' cost` };
  }
  if (extraForAny > anyRemain) {
    return { ok: false, error: `Payment over-pays by ${extraForAny - anyRemain} (engine requires exact)` };
  }
  return { ok: true, usedDiscount };
}
