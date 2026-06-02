// Ideologue powers (L3 and L5 for each of the 4 archetypes).
//
// Rulebook references (pages 32–37):
//   Capitalist:
//     L3 Prospecting    — 1/turn, pay 1 to Public Reserve → take up to 2 any.
//     L5 Land Grab      — 3/turn, evict any 1 voter (incl. majority).
//   Supremo:
//     L3 Donations      — 2/turn, snatch 1 resource from another player.
//     L5 Payback        — 2/turn, pay 1 to discard 1 opponent voter (incl. majority).
//   Showstopper:
//     L3 Going Viral    — 2/turn, +1 voter on a Voter Card you influence.
//     L5 Election Fever — Move 2 voters per zone where you have Rights
//                         (incl. majority). Implemented in gerrymander.ts
//                         via maxPerZone=2; no action handler needed here.
//   Idealist:
//     L3 Helping Hands  — 2/turn, -1 resource discount on a purchase.
//     L5 Tough Love     — 1/turn, pay 2 trust + any 2 to convert 2 of an
//                         opponent's voters (same player, same zone).
//
// Volatile-area immunity applies to ALL voter-affecting powers.
import type {
  GameState,
  ActionResult,
  Ideologue,
  PlayerId,
  Resource,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import {
  activePlayer,
  isVolatileSlot,
  powerUnlocked,
} from "@/engine/selectors";
import {
  deepClone,
  logEvent,
  addResources,
  subResources,
  totalAmount,
} from "@/engine/reducer";
import { recomputeMajorities } from "./majorities";

interface PowerSpec {
  ideologue: Ideologue;
  level: 3 | 5;
  maxPerTurn: number;
}

const POWER_SPECS: PowerSpec[] = [
  { ideologue: "capitalist", level: 3, maxPerTurn: 1 },
  { ideologue: "capitalist", level: 5, maxPerTurn: 3 },
  { ideologue: "supremo",    level: 3, maxPerTurn: 2 },
  { ideologue: "supremo",    level: 5, maxPerTurn: 2 },
  { ideologue: "showstopper",level: 3, maxPerTurn: 2 },
  { ideologue: "showstopper",level: 5, maxPerTurn: 99 }, // passive when gerrymandering
  { ideologue: "idealist",   level: 3, maxPerTurn: 2 },
  { ideologue: "idealist",   level: 5, maxPerTurn: 1 },
];

function specFor(ideologue: Ideologue, level: 3 | 5): PowerSpec | undefined {
  return POWER_SPECS.find((p) => p.ideologue === ideologue && p.level === level);
}

function usageKey(ideologue: Ideologue, level: 3 | 5): string {
  return `${ideologue}.${level}`;
}

export function applyUseIdeologuePower(
  state: GameState,
  ideologue: Ideologue,
  level: 3 | 5,
  params: Record<string, unknown> | undefined,
): ActionResult {
  if (state.phase !== "actions") {
    return { ok: false, error: `Cannot use power in phase ${state.phase}` };
  }
  if (overCap(state)) {
    return { ok: false, error: "Resource cap exceeded — discard first" };
  }
  const player = activePlayer(state);
  if (!powerUnlocked(player, ideologue, level)) {
    return { ok: false, error: `Power ${ideologue} L${level} not unlocked` };
  }
  const spec = specFor(ideologue, level);
  if (!spec) return { ok: false, error: `Unknown power ${ideologue} L${level}` };

  const used = state.powerUsage[usageKey(ideologue, level)] ?? 0;
  if (used >= spec.maxPerTurn) {
    return {
      ok: false,
      error: `Power ${ideologue} L${level} already used ${used}/${spec.maxPerTurn} this turn`,
    };
  }

  const next = deepClone(state);
  const np = next.players[next.activePlayerIdx];
  const p = params ?? {};

  switch (`${ideologue}.${level}`) {
    case "capitalist.3": {
      // Pay 1 of any resource, take up to 2 any.
      const payRes = p.payResource as Resource | undefined;
      const takeAny = (p.take ?? {}) as Partial<Record<Resource, number>>;
      if (!payRes || !RESOURCES.includes(payRes)) return { ok: false, error: "payResource missing" };
      if (np.resources[payRes] < 1) return { ok: false, error: `No ${payRes} to pay` };
      const total = totalAmount(takeAny);
      if (total < 1 || total > 2) return { ok: false, error: "Take must be 1 or 2 resources" };
      np.resources[payRes] -= 1;
      addResources(np.resources, takeAny);
      break;
    }
    case "capitalist.5": {
      // Evict any voter (incl majority); return to owner as pending.
      const zid = p.zoneId as string;
      const sidx = p.slotIdx as number;
      const z = next.zones[zid];
      if (!z) return { ok: false, error: "Unknown zone" };
      const v = z.slots[sidx];
      if (!v) return { ok: false, error: "No voter at slot" };
      if (isVolatileSlot(zid, sidx)) {
        return { ok: false, error: "Cannot evict voter in Volatile Area" };
      }
      // Remove from board.
      z.slots[sidx] = null;
      recomputeMajorities(next, zid);
      // Queue as evicted-pending for the OWNING player (placed back next
      // of THEIR turns — for simplicity we just add to pendingPlacements
      // with source=evicted; the owning player will see it.).
      next.pendingPlacements.push({
        voters: [v.playerId],
        source: "evicted",
      });
      logEvent(next, "evicted", { zoneId: zid, slotIdx: sidx, owner: v.playerId });
      break;
    }
    case "supremo.3": {
      // Snatch 1 resource from another player.
      const tpid = p.targetPlayerId as PlayerId;
      const r = p.resource as Resource;
      if (!tpid || !r || !RESOURCES.includes(r)) return { ok: false, error: "missing params" };
      if (tpid === np.id) return { ok: false, error: "Cannot snatch from self" };
      const tgt = next.players.find((x) => x.id === tpid);
      if (!tgt) return { ok: false, error: "Unknown target player" };
      if (tgt.resources[r] < 1) return { ok: false, error: `Target has no ${r}` };
      tgt.resources[r] -= 1;
      np.resources[r] += 1;
      break;
    }
    case "supremo.5": {
      // Pay 1 resource, discard 1 opponent voter (incl majority).
      const payRes = p.payResource as Resource;
      const zid = p.zoneId as string;
      const sidx = p.slotIdx as number;
      if (!payRes || !RESOURCES.includes(payRes)) return { ok: false, error: "missing payResource" };
      if (np.resources[payRes] < 1) return { ok: false, error: `No ${payRes} to pay` };
      const z = next.zones[zid];
      if (!z) return { ok: false, error: "Unknown zone" };
      const v = z.slots[sidx];
      if (!v) return { ok: false, error: "No voter at slot" };
      if (v.playerId === np.id) return { ok: false, error: "Cannot target own voter" };
      if (isVolatileSlot(zid, sidx)) return { ok: false, error: "Cannot discard volatile-area voter" };
      np.resources[payRes] -= 1;
      z.slots[sidx] = null;
      recomputeMajorities(next, zid);
      break;
    }
    case "showstopper.3": {
      // Mark a pending +1 voter on next Voter Card you influence this turn.
      // (Doesn't immediately consume the use counter for THIS power's
      // cap — we still want to enforce the 2/turn cap on activations.)
      next.powerUsage["showstopper.3.pending"] =
        (next.powerUsage["showstopper.3.pending"] ?? 0) + 1;
      break;
    }
    case "showstopper.5": {
      // Election Fever: no-op activation; effect is implemented in
      // gerrymander.ts which checks ideologue card count >= 5.
      // The activation just logs intent (rulebook: passive-during-turn).
      break;
    }
    case "idealist.3": {
      // Queue a -1 discount usable on next voter card influence or
      // conspiracy purchase.
      next.powerUsage["idealist.3.discountPending"] =
        (next.powerUsage["idealist.3.discountPending"] ?? 0) + 1;
      break;
    }
    case "idealist.5": {
      // Pay 2 trust + any 2; convert 2 voters of one opponent in one zone.
      const zid = p.zoneId as string;
      const tpid = p.targetPlayerId as PlayerId;
      const slotIndices = p.slotIndices as number[];
      const anyPayment = (p.anyPayment ?? {}) as Partial<Record<Resource, number>>;
      if (!zid || !tpid || !Array.isArray(slotIndices) || slotIndices.length !== 2) {
        return { ok: false, error: "missing params" };
      }
      // Cost (after possible Idealist L3 discount):
      const discountKey = "idealist.3.discountPending";
      const discount = next.powerUsage[discountKey] ?? 0;
      // Order of discount application: discount can reduce *either* the
      // trust cost or the any cost. Player chooses via anyPayment (we
      // simply check totals).
      let trustCost = 2;
      let anyCost = 2;
      // We don't auto-allocate the discount — we require the player to
      // submit a payment that, combined with the discount, equals
      // (trustCost + anyCost) - discount = 4 - discount. We split the
      // discount as: first apply to anyCost, then to trust.
      let remDiscount = discount;
      const anyApply = Math.min(anyCost, remDiscount); anyCost -= anyApply; remDiscount -= anyApply;
      const trustApply = Math.min(trustCost, remDiscount); trustCost -= trustApply; remDiscount -= trustApply;
      const usedDiscount = (discount - remDiscount);

      // Validate payment:
      const paidTrust = anyPayment.trust ?? 0;
      if (paidTrust < trustCost) return { ok: false, error: `Need ${trustCost} trust` };
      // The non-trust part of payment must equal anyCost; ANY resource accepted (incl. trust above trustCost).
      let nonTrust = 0;
      for (const r of RESOURCES) {
        if (r === "trust") nonTrust += Math.max(0, (anyPayment[r] ?? 0) - trustCost);
        else nonTrust += anyPayment[r] ?? 0;
      }
      if (nonTrust !== anyCost) {
        return { ok: false, error: `'any 2' portion must total ${anyCost} (got ${nonTrust})` };
      }
      // Verify resources available.
      for (const r of RESOURCES) {
        const w = anyPayment[r] ?? 0;
        if (np.resources[r] < w) return { ok: false, error: `Insufficient ${r}` };
      }
      // Deduct.
      for (const r of RESOURCES) {
        const w = anyPayment[r] ?? 0;
        if (w) np.resources[r] -= w;
      }
      // Consume discount.
      if (usedDiscount > 0) {
        next.powerUsage[discountKey] = (next.powerUsage[discountKey] ?? 0) - usedDiscount;
        if (next.powerUsage[discountKey]! <= 0) delete next.powerUsage[discountKey];
      }
      // Convert voters.
      const z = next.zones[zid];
      if (!z) return { ok: false, error: "Unknown zone" };
      for (const si of slotIndices) {
        const v = z.slots[si];
        if (!v) return { ok: false, error: `No voter at slot ${si}` };
        if (v.playerId !== tpid) return { ok: false, error: "Voter not owned by target" };
        if (isVolatileSlot(zid, si)) return { ok: false, error: "Cannot convert volatile-area voter" };
        z.slots[si] = { playerId: np.id, isMajority: false };
      }
      recomputeMajorities(next, zid);
      break;
    }
    default:
      return { ok: false, error: `Unhandled power ${ideologue} L${level}` };
  }

  next.powerUsage[usageKey(ideologue, level)] = used + 1;
  logEvent(next, "powerUsed", { ideologue, level, params: p });
  return { ok: true, state: next };
}

function overCap(state: GameState): boolean {
  const p = state.players[state.activePlayerIdx];
  return p.resources.funds + p.resources.clout + p.resources.media + p.resources.trust > p.resourceCap;
}
