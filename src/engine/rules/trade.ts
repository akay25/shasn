// Trade: resources + conspiracy cards between two players. At least one
// participant must be the active player. Each side must give at least
// one resource (or card per a loose reading).
import type {
  GameState,
  ActionResult,
  TradeBundle,
  PlayerId,
  Resource,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import {
  deepClone,
  logEvent,
  addResources,
  subResources,
} from "@/engine/reducer";
import { playerIndexById, totalResources } from "@/engine/selectors";

export function applyTrade(
  state: GameState,
  withPlayerId: PlayerId,
  give: TradeBundle,
  receive: TradeBundle,
): ActionResult {
  if (state.phase !== "actions") {
    return { ok: false, error: `Cannot trade in phase ${state.phase}` };
  }
  // At least one of the participants must be active. The action is
  // dispatched BY the active player, so this is implicit.
  const activeIdx = state.activePlayerIdx;
  const otherIdx = playerIndexById(state, withPlayerId);
  if (otherIdx === -1) return { ok: false, error: `Unknown player ${withPlayerId}` };
  if (otherIdx === activeIdx) return { ok: false, error: "Cannot trade with yourself" };

  // Each side must exchange at least one resource (per rulebook: "At
  // least 1 resource must be exchanged by both parties").
  // For digital flexibility we relax this to "at least 1 resource OR
  // conspiracy card on each side", since conspiracy trades are explicit
  // in the rulebook elsewhere. Note this in the report.
  const giveAny = bundleSize(give) > 0;
  const recvAny = bundleSize(receive) > 0;
  if (!giveAny || !recvAny) {
    return { ok: false, error: "Each side must exchange at least one resource or card" };
  }

  const next = deepClone(state);
  const a = next.players[activeIdx];
  const b = next.players[otherIdx];

  // Validate ability to pay.
  if (give.resources) {
    const ok = canPay(a.resources, give.resources);
    if (!ok.ok) return { ok: false, error: `Active player: ${ok.error}` };
  }
  if (receive.resources) {
    const ok = canPay(b.resources, receive.resources);
    if (!ok.ok) return { ok: false, error: `Trade partner: ${ok.error}` };
  }
  if (give.conspiracyCardIds) {
    for (const cid of give.conspiracyCardIds) {
      if (!a.conspiracyHand.includes(cid)) {
        return { ok: false, error: `Active player does not hold conspiracy ${cid}` };
      }
    }
  }
  if (receive.conspiracyCardIds) {
    for (const cid of receive.conspiracyCardIds) {
      if (!b.conspiracyHand.includes(cid)) {
        return { ok: false, error: `Trade partner does not hold conspiracy ${cid}` };
      }
    }
  }

  // Apply.
  if (give.resources) {
    subResources(a.resources, give.resources);
    addResources(b.resources, give.resources);
  }
  if (receive.resources) {
    subResources(b.resources, receive.resources);
    addResources(a.resources, receive.resources);
  }
  if (give.conspiracyCardIds) {
    for (const cid of give.conspiracyCardIds) {
      a.conspiracyHand = a.conspiracyHand.filter((x) => x !== cid);
      b.conspiracyHand.push(cid);
    }
  }
  if (receive.conspiracyCardIds) {
    for (const cid of receive.conspiracyCardIds) {
      b.conspiracyHand = b.conspiracyHand.filter((x) => x !== cid);
      a.conspiracyHand.push(cid);
    }
  }

  // Check resource cap on both players post-trade. We don't auto-discard
  // — UI prompts via discardResources. Engine just allows the state to
  // exist; the *active player's* over-cap blocks them from subsequent
  // actions until discarding. Partner can be over cap too (rulebook is
  // silent on what happens to a non-active player going over via trade;
  // we leave it for them to resolve at the start of their next turn).

  logEvent(next, "traded", {
    withPlayerId,
    give,
    receive,
  });
  return { ok: true, state: next };
}

function bundleSize(b: TradeBundle): number {
  let n = 0;
  if (b.resources) {
    for (const r of RESOURCES) n += b.resources[r] ?? 0;
  }
  n += b.conspiracyCardIds?.length ?? 0;
  return n;
}

function canPay(
  have: Record<Resource, number>,
  want: Partial<Record<Resource, number>>,
): { ok: true } | { ok: false; error: string } {
  for (const r of RESOURCES) {
    const w = want[r] ?? 0;
    if (w < 0) return { ok: false, error: `Negative resource amount ${r}` };
    if (have[r] < w) return { ok: false, error: `Insufficient ${r} (have ${have[r]}, need ${w})` };
  }
  return { ok: true };
}
