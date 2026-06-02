// Turn flow: handoff → ideology draw/answer → actions → headlines → next.
// Also discardResources, end-of-game detection, and the final scoring.
import type {
  GameState,
  ActionResult,
  Resource,
  PlayerId,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { deepClone, logEvent } from "@/engine/reducer";
import {
  activePlayer,
  allMajoritiesDecided,
  boardFullyFilled,
  finalScores,
  totalResources,
  totalVotersForPlayer,
} from "@/engine/selectors";
import { drawIdeology } from "./ideology";
import {
  discardUnplaceableBundles,
  discardUnplacedVoterCardVoters,
} from "./placement";
import { randomInt } from "@/engine/rng";

/** Move from handoff phase into ideology phase, drawing the top card. */
export function applyAcknowledgeHandoff(state: GameState): ActionResult {
  if (state.phase !== "handoff") {
    return { ok: false, error: `Cannot acknowledge handoff in phase ${state.phase}` };
  }
  const next = deepClone(state);
  // Reset per-turn power usage at start of turn.
  next.powerUsage = {};
  drawIdeology(next);
  if (next.currentIdeologyCard) {
    next.phase = "ideology";
    logEvent(next, "ideologyDrawn", { cardId: next.currentIdeologyCard });
  } else {
    // No ideology cards left — skip to actions.
    next.phase = "actions";
    logEvent(next, "ideologyDrawSkipped_empty", {});
  }
  return { ok: true, state: next };
}

/** Discard resources to satisfy cap or pay arbitrary cost. The amounts
 *  are subtracted, must be available, and after subtraction the player's
 *  total must be <= cap (we also allow discarding below cap, useful for
 *  paying redraw costs etc.). */
export function applyDiscardResources(
  state: GameState,
  discards: Partial<Record<Resource, number>>,
): ActionResult {
  if (state.phase !== "actions" && state.phase !== "ideology" && state.phase !== "headlines") {
    return { ok: false, error: `Cannot discard in phase ${state.phase}` };
  }
  const next = deepClone(state);
  const np = next.players[next.activePlayerIdx];
  for (const r of RESOURCES) {
    const d = discards[r] ?? 0;
    if (d < 0) return { ok: false, error: "Negative discard" };
    if (np.resources[r] < d) {
      return { ok: false, error: `Cannot discard ${d} ${r} (have ${np.resources[r]})` };
    }
  }
  for (const r of RESOURCES) {
    const d = discards[r] ?? 0;
    if (d) np.resources[r] -= d;
  }
  logEvent(next, "resourcesDiscarded", { discards });
  return { ok: true, state: next };
}

/** End the current turn:
 *   1. Discard unplaced voter-card voters (rulebook).
 *   2. If pendingHeadlines > 0, transition to headlines phase (caller
 *      must resolve them via resolveHeadline actions before endTurn-ing
 *      again — but the reducer auto-routes: when endTurn is called with
 *      pending headlines, we go to headlines phase first; the player
 *      then dispatches `resolveHeadline` repeatedly; after the last,
 *      dispatching endTurn finalizes).
 *   3. Check end-of-game conditions.
 *   4. Otherwise advance activePlayerIdx and go to handoff.
 *
 * The "last turn after board fills" rule (rulebook): if every voter
 * area is full but majorities aren't decided, every player gets one
 * final turn starting with whoever filled the last empty area. We
 * implement a `lastTurnTrigger` field by reusing pendingHeadlines? No —
 * we use a small additional flag via state.log marker. To avoid adding
 * to types.ts, we encode the lastTurn-after-fill condition by simply
 * letting play continue: as soon as allMajoritiesDecided() is true OR
 * the board has been full for one full round, end the game. To track
 * "one full round since fill", we walk through the log for a
 * `boardFilled` event and count turns since.
 */
export function applyEndTurn(state: GameState): ActionResult {
  if (state.phase !== "actions" && state.phase !== "headlines") {
    return { ok: false, error: `Cannot end turn in phase ${state.phase}` };
  }
  // Resolve cap first.
  if (overCap(state)) {
    return { ok: false, error: "Resource cap exceeded — discard first" };
  }
  const next = deepClone(state);
  // Discard unplaced voter-card voters at the END of the turn.
  if (next.phase === "actions") {
    discardUnplacedVoterCardVoters(next);
  }

  // If there are pending headlines and we're still in actions phase,
  // transition to headlines first.
  if (next.phase === "actions" && next.pendingHeadlines > 0) {
    next.phase = "headlines";
    logEvent(next, "headlinesPhase", { pending: next.pendingHeadlines });
    return { ok: true, state: next };
  }

  // If we're in headlines phase but headlines remain unresolved, error.
  if (next.phase === "headlines" && next.pendingHeadlines > 0) {
    return { ok: false, error: "Resolve all pending headlines before ending turn" };
  }

  // Check end-of-game.
  const justFilled = boardFullyFilled(next);
  const allDecided = allMajoritiesDecided(next);
  if (allDecided) {
    return endGame(next);
  }
  // Track whether board filled this turn. We use log inspection.
  const wasFullBefore = state.log.some((e) => e.type === "boardFilled");
  if (justFilled && !wasFullBefore) {
    logEvent(next, "boardFilled", { fillerIdx: next.activePlayerIdx });
  }
  // Determine if we've completed the "last turn for everyone" cycle: if
  // the board has been full and every other player has played since.
  const fillEvent = next.log.find((e) => e.type === "boardFilled");
  if (fillEvent) {
    const fillerIdx = (fillEvent.detail?.fillerIdx as number) ?? 0;
    // The filler took one more turn already (the turn they filled it);
    // each subsequent player plays one final turn. End when we've
    // looped back around past the filler.
    // We need to count turns since fill. Approximate by counting
    // turn-end events after the fill event.
    const fillEventIdx = next.log.findIndex((e) => e === fillEvent);
    let turnEnds = 0;
    for (let i = fillEventIdx + 1; i < next.log.length; i++) {
      if (next.log[i].type === "turnEnded") turnEnds += 1;
    }
    // If everyone has had their final turn (one per player after fill),
    // the game ends.
    if (turnEnds + 1 >= next.players.length) {
      // The current end-turn IS the (players.length)th turn end since fill.
      logEvent(next, "turnEnded", {});
      return endGame(next);
    }
  }

  // Reset for next player.
  next.pendingHeadlines = 0; // headlines already resolved
  // pendingPlacements: keep evicted/donated bundles for the OWNING
  // player. Voter-card unplaced were already discarded above.
  next.powerUsage = {};
  logEvent(next, "turnEnded", {});

  next.activePlayerIdx = (next.activePlayerIdx + 1) % next.players.length;
  next.turn += 1;
  next.phase = "handoff";

  return { ok: true, state: next };
}

/** Finalize end-of-game: set phase=ended, log scores. */
function endGame(state: GameState): ActionResult {
  state.phase = "ended";
  const scores = finalScores(state);
  // Determine winner with tiebreakers.
  const ranking = state.players
    .map((p) => ({
      id: p.id,
      score: scores[p.id],
      totalVoters: totalVotersForPlayer(state, p.id),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.totalVoters !== a.totalVoters) return b.totalVoters - a.totalVoters;
      return 0; // random tiebreak; deterministic via seed
    });
  // If still tied at the top, use seed-based random.
  if (
    ranking.length > 1 &&
    ranking[0].score === ranking[1].score &&
    ranking[0].totalVoters === ranking[1].totalVoters
  ) {
    const { value } = randomInt(2, state.rngSeed);
    if (value === 1) {
      [ranking[0], ranking[1]] = [ranking[1], ranking[0]];
    }
  }
  logEvent(state, "gameEnded", { scores, winner: ranking[0]?.id });
  return { ok: true, state };
}

function overCap(state: GameState): boolean {
  const p = state.players[state.activePlayerIdx];
  return totalResources(p) > p.resourceCap;
}
