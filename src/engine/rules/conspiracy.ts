// Conspiracy cards: buy (top of deck only, pay N any-resource) and play
// (any time on own turn — v1 limitation: skip "before opponent answers
// ideology" timing).
import type {
  GameState,
  ActionResult,
  Resource,
  ConspiracyCard,
  ConspiracyEffect,
  PlayerId,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";
import { shuffle } from "@/engine/rng";
import {
  deepClone,
  logEvent,
  totalAmount,
  addResources,
} from "@/engine/reducer";
import { isVolatileSlot } from "@/engine/selectors";
import { recomputeMajorities } from "./majorities";

export function lookupConspiracy(id: string): ConspiracyCard | undefined {
  return CONSPIRACY_CARDS.find((c) => c.id === id);
}

/** Buy the top conspiracy card. Payment must total >= card.cost (any
 *  combination of resources). Idealist L3 discount can apply. */
export function applyBuyConspiracy(
  state: GameState,
  payment: Partial<Record<Resource, number>>,
): ActionResult {
  if (state.phase !== "actions") {
    return { ok: false, error: `Cannot buy conspiracy in phase ${state.phase}` };
  }
  if (overCap(state)) return { ok: false, error: "Resource cap exceeded — discard first" };

  // Top of deck (reshuffle if needed).
  const next = deepClone(state);
  if (next.decks.conspiracy.length === 0) {
    if (next.decks.conspiracyDiscard.length === 0) {
      return { ok: false, error: "No conspiracy cards available" };
    }
    const { shuffled, nextSeed } = shuffle(next.decks.conspiracyDiscard, next.rngSeed);
    next.decks.conspiracy = shuffled;
    next.decks.conspiracyDiscard = [];
    next.rngSeed = nextSeed;
  }
  const topId = next.decks.conspiracy[0]!;
  const card = lookupConspiracy(topId);
  if (!card) return { ok: false, error: "Unknown conspiracy card id at top of deck" };

  // Discount.
  const discountKey = `idealist.3.discountPending`;
  const discount = next.powerUsage[discountKey] ?? 0;
  const required = Math.max(0, card.cost - discount);
  const used = Math.min(discount, card.cost);
  const paid = totalAmount(payment);
  if (paid !== required) {
    return { ok: false, error: `Payment must total exactly ${required} (paid ${paid})` };
  }

  // Verify resources available.
  const np = next.players[next.activePlayerIdx];
  for (const r of RESOURCES) {
    const want = payment[r] ?? 0;
    if (np.resources[r] < want) {
      return { ok: false, error: `Insufficient ${r}` };
    }
  }
  // Deduct.
  for (const r of RESOURCES) {
    const want = payment[r] ?? 0;
    if (want) np.resources[r] -= want;
  }
  // Consume discount.
  if (used > 0) {
    next.powerUsage[discountKey] = (next.powerUsage[discountKey] ?? 0) - used;
    if (next.powerUsage[discountKey]! <= 0) delete next.powerUsage[discountKey];
  }

  // Move card into player's hand.
  next.decks.conspiracy.shift();
  np.conspiracyHand.push(card.id);

  logEvent(next, "conspiracyBought", { cardId: card.id, cost: card.cost, paid });
  return { ok: true, state: next };
}

/** Play a conspiracy card. Resolves the effect based on `kind`. */
export function applyPlayConspiracy(
  state: GameState,
  cardId: string,
  params: Record<string, unknown> | undefined,
): ActionResult {
  if (state.phase !== "actions") {
    return { ok: false, error: `Cannot play conspiracy in phase ${state.phase}` };
  }
  const card = lookupConspiracy(cardId);
  if (!card) return { ok: false, error: "Unknown conspiracy card id" };
  const np = state.players[state.activePlayerIdx];
  if (!np.conspiracyHand.includes(cardId)) {
    return { ok: false, error: "Card not in active player's hand" };
  }

  const next = deepClone(state);
  const player = next.players[next.activePlayerIdx];
  // Remove from hand.
  player.conspiracyHand = player.conspiracyHand.filter((c) => c !== cardId);
  next.decks.conspiracyDiscard.push(cardId);

  // Resolve effect.
  const res = resolveConspiracyEffect(next, card.effect, params ?? {});
  if (!res.ok) return res;

  logEvent(next, "conspiracyPlayed", { cardId, effect: card.effect.kind, params });
  return { ok: true, state: next };
}

/** Apply a ConspiracyEffect to state (state already mutated, returns
 *  either ok or error). */
export function resolveConspiracyEffect(
  state: GameState,
  effect: ConspiracyEffect,
  params: Record<string, unknown>,
): ActionResult {
  const np = state.players[state.activePlayerIdx];
  switch (effect.kind) {
    case "gainResources": {
      const gain = (params.resources ?? effect.params?.resources) as
        | Partial<Record<Resource, number>>
        | undefined;
      if (!gain) return { ok: false, error: "gainResources: missing resources param" };
      addResources(np.resources, gain);
      return { ok: true, state };
    }
    case "discardOpponentVoter": {
      const tpid = params.targetPlayerId as PlayerId;
      const zid = params.zoneId as string;
      const slotIdx = params.slotIdx as number;
      if (!tpid || !zid || slotIdx === undefined) {
        return { ok: false, error: "discardOpponentVoter: missing params" };
      }
      const z = state.zones[zid];
      if (!z) return { ok: false, error: `Unknown zone ${zid}` };
      const slot = z.slots[slotIdx];
      if (!slot) return { ok: false, error: "No voter at target slot" };
      if (slot.playerId !== tpid) return { ok: false, error: "Voter does not belong to target player" };
      if (slot.playerId === np.id) return { ok: false, error: "Cannot target own voter" };
      if (isVolatileSlot(zid, slotIdx)) {
        return { ok: false, error: "Voters in Volatile Areas cannot be discarded" };
      }
      z.slots[slotIdx] = null;
      recomputeMajorities(state, zid);
      return { ok: true, state };
    }
    case "peekConspiracy": {
      // Pure UI revelation — engine just logs.
      return { ok: true, state };
    }
    case "extraVoterCard": {
      // The engine returns success here; the UI orchestrates a follow-up
      // `influenceVoterCard` with payment=0. The simpler engine model is
      // to grant a "free influence" charge via powerUsage.
      const key = "conspiracy.freeInfluence";
      state.powerUsage[key] = (state.powerUsage[key] ?? 0) + 1;
      return { ok: true, state };
    }
    case "swapVoters": {
      const zA = params.zoneA as string;
      const sA = params.slotA as number;
      const zB = params.zoneB as string;
      const sB = params.slotB as number;
      const zaSt = state.zones[zA];
      const zbSt = state.zones[zB];
      if (!zaSt || !zbSt) return { ok: false, error: "Unknown zone in swap" };
      const a = zaSt.slots[sA];
      const b = zbSt.slots[sB];
      if (!a || !b) return { ok: false, error: "Both slots must contain a voter" };
      if (isVolatileSlot(zA, sA) || isVolatileSlot(zB, sB)) {
        return { ok: false, error: "Cannot swap voters in Volatile Areas" };
      }
      if (a.isMajority || b.isMajority) {
        return { ok: false, error: "Cannot swap majority voters" };
      }
      zaSt.slots[sA] = b;
      zbSt.slots[sB] = a;
      recomputeMajorities(state, zA);
      if (zA !== zB) recomputeMajorities(state, zB);
      return { ok: true, state };
    }
    default:
      return { ok: false, error: `Unhandled conspiracy effect ${(effect as any).kind}` };
  }
}

function overCap(state: GameState): boolean {
  const p = state.players[state.activePlayerIdx];
  return p.resources.funds + p.resources.clout + p.resources.media + p.resources.trust > p.resourceCap;
}
