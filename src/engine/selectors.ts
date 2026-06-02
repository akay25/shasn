// Derived state helpers — pure functions over GameState.
import type {
  GameState,
  Player,
  PlayerId,
  Resource,
  Ideologue,
  ZoneState,
} from "./types";
import { IDEOLOGUE_RESOURCE, RESOURCES } from "./types";
import { getZone } from "@/data/board";
import { IDEOLOGY_CARDS } from "@/data/cards/ideology";

// ---------- Players ----------

export function activePlayer(state: GameState): Player {
  return state.players[state.activePlayerIdx];
}

export function playerById(state: GameState, id: PlayerId): Player | undefined {
  return state.players.find((p) => p.id === id);
}

export function playerIndexById(state: GameState, id: PlayerId): number {
  return state.players.findIndex((p) => p.id === id);
}

// ---------- Resources ----------

export function totalResources(p: Player): number {
  return RESOURCES.reduce((sum, r) => sum + (p.resources[r] ?? 0), 0);
}

// ---------- Ideologue counts ----------

export function ideologueCardCount(p: Player, ideologue: Ideologue): number {
  let n = 0;
  for (const choice of p.ideologyCards) {
    const card = IDEOLOGY_CARDS.find((c) => c.id === choice.cardId);
    if (!card) continue;
    const side = choice.side === "left" ? card.left : card.right;
    if (side.ideologue === ideologue) n++;
  }
  return n;
}

export function passiveResourcesFor(p: Player): Partial<Record<Resource, number>> {
  const out: Partial<Record<Resource, number>> = {};
  for (const id of ["capitalist", "supremo", "showstopper", "idealist"] as Ideologue[]) {
    const n = ideologueCardCount(p, id);
    const bonus = Math.floor(n / 2);
    if (bonus > 0) {
      const r = IDEOLOGUE_RESOURCE[id];
      out[r] = (out[r] ?? 0) + bonus;
    }
  }
  return out;
}

export function powerUnlocked(
  p: Player,
  ideologue: Ideologue,
  level: 3 | 5,
): boolean {
  return ideologueCardCount(p, ideologue) >= level;
}

// ---------- Zones / voters ----------

export function voterCountInZone(
  zoneState: ZoneState,
  playerId: PlayerId,
): number {
  let n = 0;
  for (const slot of zoneState.slots) {
    if (slot && slot.playerId === playerId) n++;
  }
  return n;
}

export function totalVotersInZone(zoneState: ZoneState): number {
  let n = 0;
  for (const slot of zoneState.slots) if (slot) n++;
  return n;
}

export function emptySlotsInZone(zoneState: ZoneState): number {
  let n = 0;
  for (const slot of zoneState.slots) if (slot === null) n++;
  return n;
}

export function firstEmptySlot(zoneState: ZoneState): number {
  return zoneState.slots.findIndex((s) => s === null);
}

export function isVolatileSlot(
  state: GameState,
  zoneId: string,
  slotIdx: number,
): boolean {
  return getZone(state.board, zoneId).volatileSlotIndices.includes(slotIdx);
}

// ---------- Gerrymandering rights ----------

export function gerrymanderingRightsHolder(
  state: GameState,
  zoneId: string,
): PlayerId | null {
  const z = state.zones[zoneId];
  if (!z) return null;
  const counts = new Map<PlayerId, number>();
  for (const slot of z.slots) {
    if (slot) counts.set(slot.playerId, (counts.get(slot.playerId) ?? 0) + 1);
  }
  let top: PlayerId | null = null;
  let topN = 0;
  let tied = false;
  for (const [pid, n] of counts) {
    if (n > topN) {
      top = pid;
      topN = n;
      tied = false;
    } else if (n === topN) {
      tied = true;
    }
  }
  if (tied) return null;
  return top;
}

// ---------- Voter totals per player on board ----------

export function totalVotersForPlayer(state: GameState, pid: PlayerId): number {
  let n = 0;
  for (const z of Object.values(state.zones)) {
    n += voterCountInZone(z, pid);
  }
  return n;
}

// ---------- Score: majority voters per player ----------

export function majorityVotersForPlayer(state: GameState, pid: PlayerId): number {
  let n = 0;
  for (const z of Object.values(state.zones)) {
    for (const slot of z.slots) {
      if (slot && slot.playerId === pid && slot.isMajority) n++;
    }
  }
  return n;
}

export function finalScores(state: GameState): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = {};
  for (const p of state.players) out[p.id] = majorityVotersForPlayer(state, p.id);
  return out;
}

// ---------- End-game check ----------

/**
 * Returns true if every zone has either:
 *   - a formed majority where the holder's voter count is so high that no
 *     other player could exceed it even if every remaining empty slot were
 *     filled by that opponent (i.e. holder >= opponent_max + empty), OR
 *   - every voter area on the board is full (no empty slots in this zone)
 * For the rulebook's stricter end condition (all majorities decided OR
 * every voter area filled), we check both per-zone: if a zone is full it
 * counts as decided regardless of majority outcome.
 */
export function allMajoritiesDecided(state: GameState): boolean {
  for (const z of state.board.zones) {
    const zs = state.zones[z.id];
    const empty = emptySlotsInZone(zs);
    if (empty === 0) continue; // full zone → decided
    if (!zs.majorityHolder) return false; // no majority and empty slots remain
    // Holder exists. Check if any opponent could still flip it by filling
    // all remaining empty slots: holder voters vs opponent + empty.
    const holderN = voterCountInZone(zs, zs.majorityHolder);
    let opponentMax = 0;
    for (const p of state.players) {
      if (p.id === zs.majorityHolder) continue;
      const n = voterCountInZone(zs, p.id);
      if (n > opponentMax) opponentMax = n;
    }
    // If opponent + empty could match or beat holder, not yet decided.
    if (opponentMax + empty >= holderN) return false;
  }
  return true;
}

export function boardFullyFilled(state: GameState): boolean {
  for (const z of Object.values(state.zones)) {
    if (emptySlotsInZone(z) > 0) return false;
  }
  return true;
}

// ---------- Pending placement helpers ----------

export function pendingVoterCount(state: GameState): number {
  let n = 0;
  for (const pp of state.pendingPlacements) n += pp.voters.length;
  return n;
}
