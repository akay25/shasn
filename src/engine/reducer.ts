// Central reducer for the SHASN engine. Pure function `applyAction(state,
// action) -> ActionResult`. Dispatches by `action.t` to dedicated handlers
// in rule modules. Handlers may also live here for simple actions.
//
// This file also exports a few tiny shared utility helpers used by the
// rule modules — keeping them here (rather than in a separate `utils.ts`)
// keeps the engine surface area minimal.
import type {
  GameState,
  Action,
  ActionResult,
  Resource,
  GameEvent,
} from "./types";
import { RESOURCES } from "./types";
import { createInitialState } from "./state";

// -------------------- Shared utility helpers --------------------
// These are exported so rule modules can share a single implementation.

/** Deep-clone state via JSON. State is JSON-safe by design. */
export function deepClone<T>(s: T): T {
  return JSON.parse(JSON.stringify(s));
}

/** Append a GameEvent to state.log (mutating state). */
export function logEvent(
  state: GameState,
  type: string,
  detail?: Record<string, unknown>,
): GameEvent {
  const ev: GameEvent = {
    turn: state.turn,
    playerId: state.players[state.activePlayerIdx]?.id ?? "?",
    type,
    ...(detail ? { detail } : {}),
  };
  state.log.push(ev);
  return ev;
}

/** Add a partial resource record to a player's resources, in place. */
export function addResources(
  target: Record<Resource, number>,
  add: Partial<Record<Resource, number>>,
): void {
  for (const r of RESOURCES) {
    const a = add[r];
    if (a) target[r] += a;
  }
}

/** Subtract a partial resource record. Returns ok=false (without
 *  mutating) if any resource would go negative. */
export function subResources(
  target: Record<Resource, number>,
  sub: Partial<Record<Resource, number>>,
): { ok: true } | { ok: false; error: string } {
  for (const r of RESOURCES) {
    const s = sub[r];
    if (s && target[r] < s) {
      return { ok: false, error: `Not enough ${r} (have ${target[r]}, need ${s})` };
    }
  }
  for (const r of RESOURCES) {
    const s = sub[r];
    if (s) target[r] -= s;
  }
  return { ok: true };
}

/** Sum the values of a partial resource record. */
export function totalAmount(rec: Partial<Record<Resource, number>>): number {
  let n = 0;
  for (const r of RESOURCES) {
    const v = rec[r];
    if (v) n += v;
  }
  return n;
}

// -------------------- Dispatcher --------------------

import {
  applyAnswerIdeology,
  applyRedrawIdeology,
} from "./rules/ideology";
import {
  applyInfluenceVoterCard,
  applyPlaceVoter,
} from "./rules/voterCards";
import { applyGerrymander } from "./rules/gerrymander";
import { applyTrade } from "./rules/trade";
import {
  applyBuyConspiracy,
  applyPlayConspiracy,
} from "./rules/conspiracy";
import { applyResolveHeadline } from "./rules/headlines";
import { applyUseIdeologuePower } from "./rules/powers";
import {
  applyAcknowledgeHandoff,
  applyDiscardResources,
  applyEndTurn,
} from "./rules/turn";

export function applyAction(state: GameState, action: Action): ActionResult {
  try {
    switch (action.t) {
      case "setupGame": {
        if (state.phase !== "setup" && state.players.length === 0) {
          // Allow setup if state is in a "fresh" placeholder mode.
        }
        try {
          const fresh = createInitialState({
            players: action.players,
            seed: action.seed,
            removeSensitive: action.removeSensitive,
          });
          return { ok: true, state: fresh };
        } catch (e: any) {
          return { ok: false, error: e?.message ?? "setup failed" };
        }
      }
      case "acknowledgeHandoff":
        return applyAcknowledgeHandoff(state);
      case "answerIdeology":
        return applyAnswerIdeology(state, action.side);
      case "redrawIdeology":
        return applyRedrawIdeology(state);
      case "chooseAnyResource": {
        // Apply ad-hoc resource pick (e.g. setup time). We allow this in
        // any phase: simply adds `amount` of the chosen resource. The UI
        // uses this to resolve `any` from a previous payout.
        const next = deepClone(state);
        const np = next.players[next.activePlayerIdx];
        if (action.amount <= 0) return { ok: false, error: "amount must be positive" };
        np.resources[action.resource] += action.amount;
        logEvent(next, "anyResourceChosen", {
          resource: action.resource,
          amount: action.amount,
        });
        return { ok: true, state: next };
      }
      case "influenceVoterCard":
        return applyInfluenceVoterCard(state, action.openIdx, action.payment);
      case "placeVoter":
        return applyPlaceVoter(
          state,
          action.zoneId,
          action.slotIdx,
          action.pendingIdx,
        );
      case "gerrymander":
        return applyGerrymander(
          state,
          action.fromZone,
          action.fromSlotIdx,
          action.toZone,
          action.toSlotIdx,
        );
      case "buyConspiracy":
        return applyBuyConspiracy(state, action.payment);
      case "playConspiracy":
        return applyPlayConspiracy(state, action.cardId, action.params);
      case "trade":
        return applyTrade(state, action.withPlayerId, action.give, action.receive);
      case "useIdeologuePower":
        return applyUseIdeologuePower(
          state,
          action.ideologue,
          action.level,
          action.params,
        );
      case "resolveHeadline":
        return applyResolveHeadline(state, action.params);
      case "discardResources":
        return applyDiscardResources(state, action.discards);
      case "endTurn":
        return applyEndTurn(state);
      default:
        // Exhaustiveness check.
        return { ok: false, error: `Unhandled action: ${(action as any).t}` };
    }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
