// Headline cards: drawn when a voter is placed in a Volatile Area, queued
// (`pendingHeadlines`), and resolved one-at-a-time in the `headlines`
// phase via `resolveHeadline` actions.
import type {
  GameState,
  ActionResult,
  Resource,
  HeadlineCard,
  HeadlineEffect,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { HEADLINE_CARDS } from "@/data/cards/headline";
import { shuffle, randomInt } from "@/engine/rng";
import {
  deepClone,
  logEvent,
  addResources,
} from "@/engine/reducer";
import { isVolatileSlot } from "@/engine/selectors";
import { recomputeMajorities } from "./majorities";

export function lookupHeadline(id: string): HeadlineCard | undefined {
  return HEADLINE_CARDS.find((c) => c.id === id);
}

/** Draw the top headline (reshuffles discard if needed). */
function drawHeadline(state: GameState): HeadlineCard | null {
  if (state.decks.headline.length === 0) {
    if (state.decks.headlineDiscard.length === 0) return null;
    const { shuffled, nextSeed } = shuffle(state.decks.headlineDiscard, state.rngSeed);
    state.decks.headline = shuffled;
    state.decks.headlineDiscard = [];
    state.rngSeed = nextSeed;
  }
  const id = state.decks.headline.shift();
  if (!id) return null;
  state.decks.headlineDiscard.push(id);
  return lookupHeadline(id) ?? null;
}

/** Resolve the next pending headline. Returns the new state. */
export function applyResolveHeadline(
  state: GameState,
  params: Record<string, unknown> | undefined,
): ActionResult {
  if (state.phase !== "headlines") {
    return { ok: false, error: `Cannot resolve headline in phase ${state.phase}` };
  }
  if (state.pendingHeadlines <= 0) {
    return { ok: false, error: "No pending headlines to resolve" };
  }
  const next = deepClone(state);
  const card = drawHeadline(next);
  if (!card) {
    // Out of cards entirely — just decrement and proceed.
    next.pendingHeadlines -= 1;
    logEvent(next, "headlineSkipped_empty", {});
  } else {
    const res = resolveHeadlineEffect(next, card.effect, params ?? {});
    if (!res.ok) return res;
    next.pendingHeadlines -= 1;
    logEvent(next, "headlineResolved", { cardId: card.id, effect: card.effect.kind, params });
  }
  // If all headlines done, transition to handoff. The reducer end-turn
  // sequence drives this transition; here we just keep the phase as
  // `headlines` until reducer ends the turn.
  return { ok: true, state: next };
}

/** Pure effect application. */
export function resolveHeadlineEffect(
  state: GameState,
  effect: HeadlineEffect,
  params: Record<string, unknown>,
): ActionResult {
  const np = state.players[state.activePlayerIdx];
  switch (effect.kind) {
    case "gainResources": {
      const gain = (params.resources ?? effect.params?.resources) as
        | Partial<Record<Resource, number>>
        | undefined;
      if (!gain) return { ok: false, error: "gainResources: missing resources" };
      addResources(np.resources, gain);
      return { ok: true, state };
    }
    case "loseResources": {
      const lose = (params.resources ?? effect.params?.resources) as
        | Partial<Record<Resource, number>>
        | undefined;
      if (!lose) return { ok: false, error: "loseResources: missing resources" };
      // Clamp to zero.
      for (const r of RESOURCES) {
        const take = lose[r] ?? 0;
        np.resources[r] = Math.max(0, np.resources[r] - take);
      }
      return { ok: true, state };
    }
    case "globalResourceShift": {
      const delta = (params.delta ?? effect.params?.delta) as
        | Partial<Record<Resource, number>>
        | undefined;
      if (!delta) return { ok: false, error: "globalResourceShift: missing delta" };
      for (const p of state.players) {
        for (const r of RESOURCES) {
          const d = delta[r] ?? 0;
          p.resources[r] = Math.max(0, p.resources[r] + d);
        }
      }
      return { ok: true, state };
    }
    case "discardRandomVoter": {
      // Discard a random non-majority, non-volatile voter of the active player.
      const candidates: { zoneId: string; slotIdx: number }[] = [];
      for (const [zid, z] of Object.entries(state.zones)) {
        for (let i = 0; i < z.slots.length; i++) {
          const s = z.slots[i];
          if (!s) continue;
          if (s.playerId !== np.id) continue;
          if (s.isMajority) continue;
          if (isVolatileSlot(state, zid, i)) continue;
          candidates.push({ zoneId: zid, slotIdx: i });
        }
      }
      if (candidates.length === 0) return { ok: true, state };
      const { value, nextSeed } = randomInt(candidates.length, state.rngSeed);
      state.rngSeed = nextSeed;
      const tgt = candidates[value];
      state.zones[tgt.zoneId].slots[tgt.slotIdx] = null;
      recomputeMajorities(state, tgt.zoneId);
      return { ok: true, state };
    }
    case "moveVoter": {
      // Engine accepts explicit params: { fromZone, fromSlotIdx, toZone, toSlotIdx }.
      const fz = params.fromZone as string;
      const fs = params.fromSlotIdx as number;
      const tz = params.toZone as string;
      const ts = params.toSlotIdx as number;
      if (!fz || fs === undefined || !tz || ts === undefined) {
        return { ok: false, error: "moveVoter: missing params" };
      }
      const fzSt = state.zones[fz];
      const tzSt = state.zones[tz];
      if (!fzSt || !tzSt) return { ok: false, error: "Unknown zone" };
      const v = fzSt.slots[fs];
      if (!v) return { ok: false, error: "No voter at source" };
      if (v.playerId !== np.id) return { ok: false, error: "Not your voter" };
      if (isVolatileSlot(state, fz, fs)) return { ok: false, error: "Cannot move volatile-area voter" };
      if (v.isMajority) return { ok: false, error: "Cannot move majority voter" };
      if (tzSt.slots[ts] !== null) return { ok: false, error: "Target slot occupied" };
      fzSt.slots[fs] = null;
      tzSt.slots[ts] = { playerId: v.playerId, isMajority: false };
      recomputeMajorities(state, fz);
      if (fz !== tz) recomputeMajorities(state, tz);
      return { ok: true, state };
    }
    default:
      return { ok: false, error: `Unhandled headline effect ${(effect as any).kind}` };
  }
}
