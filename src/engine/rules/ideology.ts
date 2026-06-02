// Ideology card flow: drawing at start of turn, answering, redrawing.
import type {
  GameState,
  ActionResult,
  Resource,
  IdeologyCard,
  IdeologyCardSide,
} from "@/engine/types";
import { RESOURCES, IDEOLOGUE_RESOURCE } from "@/engine/types";
import { IDEOLOGY_CARDS } from "@/data/cards/ideology";
import { shuffle } from "@/engine/rng";
import {
  activePlayer,
  totalResources,
  passiveResourcesFor,
} from "@/engine/selectors";
import {
  logEvent,
  deepClone,
  addResources,
  totalAmount,
} from "@/engine/reducer";

export function lookupIdeologyCard(id: string): IdeologyCard | undefined {
  return IDEOLOGY_CARDS.find((c) => c.id === id);
}

/** Draw the top ideology card into `currentIdeologyCard`. Reshuffles
 *  discard if the draw pile is empty. */
export function drawIdeology(state: GameState): void {
  if (state.decks.ideology.length === 0) {
    if (state.decks.ideologyDiscard.length === 0) {
      state.currentIdeologyCard = null;
      return;
    }
    const { shuffled, nextSeed } = shuffle(state.decks.ideologyDiscard, state.rngSeed);
    state.decks.ideology = shuffled;
    state.decks.ideologyDiscard = [];
    state.rngSeed = nextSeed;
  }
  state.currentIdeologyCard = state.decks.ideology.shift() ?? null;
}

/** Answer the current ideology card with left or right. */
export function applyAnswerIdeology(
  state: GameState,
  side: "left" | "right",
): ActionResult {
  if (state.phase !== "ideology") {
    return { ok: false, error: `Cannot answer ideology in phase ${state.phase}` };
  }
  if (!state.currentIdeologyCard) {
    return { ok: false, error: "No ideology card drawn" };
  }
  const next = deepClone(state);
  const card = lookupIdeologyCard(next.currentIdeologyCard!);
  if (!card) return { ok: false, error: "Unknown ideology card id" };
  const chosen: IdeologyCardSide = side === "left" ? card.left : card.right;

  const player = next.players[next.activePlayerIdx];
  // Add side payout. `any` resources are auto-assigned to the side's
  // ideologue resource (UI may instead split via chooseAnyResource — out
  // of scope for v1 engine handler).
  const payout: Partial<Record<Resource, number>> = {};
  for (const r of RESOURCES) {
    if (chosen.payout[r]) payout[r] = chosen.payout[r];
  }
  if (chosen.payout.any) {
    const r = IDEOLOGUE_RESOURCE[chosen.ideologue];
    payout[r] = (payout[r] ?? 0) + chosen.payout.any;
  }
  addResources(player.resources, payout);

  // Record the card BEFORE passive computation so the new card counts
  // toward the passive bonus this turn (rulebook explicit).
  player.ideologyCards.push({ cardId: card.id, side });

  // Add passive ideologue bonuses.
  const passives = passiveResourcesFor(player);
  addResources(player.resources, passives);

  // Discard slot.
  next.decks.ideologyDiscard.push(card.id);
  next.currentIdeologyCard = null;

  // Move to actions phase. If over cap, the discardResources action is
  // required before other actions (enforced in reducer).
  next.phase = "actions";

  logEvent(next, "ideologyAnswered", {
    cardId: card.id,
    side,
    payout,
    passives,
  });
  return { ok: true, state: next };
}

/** Pay any 4 resources to redraw. */
export function applyRedrawIdeology(state: GameState): ActionResult {
  if (state.phase !== "ideology") {
    return { ok: false, error: `Cannot redraw in phase ${state.phase}` };
  }
  if (!state.currentIdeologyCard) {
    return { ok: false, error: "No ideology card drawn" };
  }
  const player = activePlayer(state);
  if (totalResources(player) < 4) {
    return { ok: false, error: "Not enough resources to redraw (need any 4)" };
  }
  const next = deepClone(state);
  const np = next.players[next.activePlayerIdx];
  let need = 4;
  for (const r of RESOURCES) {
    if (need === 0) break;
    const take = Math.min(np.resources[r], need);
    np.resources[r] -= take;
    need -= take;
  }
  if (need > 0) return { ok: false, error: "Insufficient resources for redraw" };

  // Discard current, draw a new one.
  next.decks.ideologyDiscard.push(next.currentIdeologyCard!);
  next.currentIdeologyCard = null;
  drawIdeology(next);
  logEvent(next, "ideologyRedrawn", {});
  return { ok: true, state: next };
}
