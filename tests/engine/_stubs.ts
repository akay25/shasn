// Shared stub card data + state factory for tests. The mocks themselves
// are declared per test file (vi.mock is per-file hoisted in vitest).
import type {
  GameState,
  Player,
  ZoneState,
  Ideologue,
  PlayerColor,
  IdeologyCard,
  VoterCard,
  ConspiracyCard,
  HeadlineCard,
  PlayerId,
} from "@/engine/types";
import { BOARD } from "@/data/board";

export const STUB_IDEOLOGY_CARDS: IdeologyCard[] = [
  ...gen("cap", "capitalist", 6),
  ...gen("sup", "supremo", 6),
  ...gen("sho", "showstopper", 6),
  ...gen("ide", "idealist", 6),
];
function gen(prefix: string, ideo: Ideologue, n: number): IdeologyCard[] {
  const out: IdeologyCard[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: `${prefix}-${i}`,
      prompt: `${prefix} prompt ${i}`,
      left:  { text: "L", ideologue: ideo, payout: { funds: 1, clout: 1 } },
      right: { text: "R", ideologue: ideo, payout: { media: 1, trust: 1 } },
    });
  }
  return out;
}

export const STUB_VOTER_CARDS: VoterCard[] = [
  { id: "v1-a", voters: 1, cost: { funds: 1 } },
  { id: "v1-b", voters: 1, cost: { clout: 1 } },
  { id: "v1-c", voters: 1, cost: { media: 1 } },
  { id: "v2-a", voters: 2, cost: { funds: 1, clout: 1 } },
  { id: "v2-b", voters: 2, cost: { trust: 2 } },
  { id: "v3-a", voters: 3, cost: { any: 3 } },
  { id: "v3-b", voters: 3, cost: { funds: 1, clout: 1, media: 1 } },
  { id: "v3-c", voters: 3, cost: { trust: 3 } },
  { id: "v1-d", voters: 1, cost: { trust: 1 } },
  { id: "v2-c", voters: 2, cost: { media: 2 } },
];

export const STUB_CONSPIRACY_CARDS: ConspiracyCard[] = [
  {
    id: "c-gain",
    name: "Gain Funds",
    description: "+3 funds",
    cost: 4,
    effect: { kind: "gainResources", params: { resources: { funds: 3 } } },
  },
  {
    id: "c-discard",
    name: "Discard Opponent",
    description: "Discard target opponent voter.",
    cost: 5,
    effect: { kind: "discardOpponentVoter" },
  },
  {
    id: "c-extra",
    name: "Extra Voter",
    description: "Influence one for free.",
    cost: 4,
    effect: { kind: "extraVoterCard" },
  },
];

export const STUB_HEADLINE_CARDS: HeadlineCard[] = [
  {
    id: "h-gain",
    name: "Boom",
    description: "+2 funds",
    effect: { kind: "gainResources", params: { resources: { funds: 2 } } },
  },
  {
    id: "h-lose",
    name: "Bust",
    description: "-1 clout",
    effect: { kind: "loseResources", params: { resources: { clout: 1 } } },
  },
  {
    id: "h-global",
    name: "Wave",
    description: "All players -1 media",
    effect: { kind: "globalResourceShift", params: { delta: { media: -1 } } },
  },
];

export function freshState(opts: { players?: number } = {}): GameState {
  const nPlayers = opts.players ?? 2;
  const names = ["Alice", "Bob", "Cara", "Dan", "Eve"];
  const colors: PlayerColor[] = ["red", "blue", "yellow", "green", "purple"];
  const players: Player[] = [];
  for (let i = 0; i < nPlayers; i++) {
    players.push({
      id: `p${i + 1}`,
      name: names[i],
      color: colors[i],
      // Start well under the 12 cap so a typical Ideology Card payout
      // (+2) doesn't push the player over and trip the cap check.
      resources: { funds: 2, clout: 2, media: 2, trust: 2 },
      resourceCap: 12,
      ideologyCards: [],
      conspiracyHand: [],
      iouOwed: 0,
    });
  }
  const zones: Record<string, ZoneState> = {};
  for (const z of BOARD.zones) {
    zones[z.id] = { slots: new Array(z.capacity).fill(null), majorityHolder: null };
  }
  return {
    phase: "handoff",
    players,
    activePlayerIdx: 0,
    turn: 1,
    zones,
    decks: {
      ideology:   STUB_IDEOLOGY_CARDS.map((c) => c.id),
      ideologyDiscard: [],
      voter:      STUB_VOTER_CARDS.map((c) => c.id).slice(3),
      voterDiscard: [],
      conspiracy: STUB_CONSPIRACY_CARDS.map((c) => c.id),
      conspiracyDiscard: [],
      headline:   STUB_HEADLINE_CARDS.map((c) => c.id),
      headlineDiscard: [],
    },
    openVoterCards: [
      STUB_VOTER_CARDS[0].id,
      STUB_VOTER_CARDS[1].id,
      STUB_VOTER_CARDS[2].id,
    ],
    currentIdeologyCard: null,
    pendingPlacements: [],
    pendingHeadlines: 0,
    powerUsage: {},
    rngSeed: 42,
    removeSensitive: false,
    log: [],
  };
}

/** Place N voters of `pid` in `zoneId`. Skips volatile slots if asked. */
export function placeVoters(
  state: GameState,
  zoneId: string,
  pid: PlayerId,
  n: number,
  opts: { volatileIndices?: number[]; skipVolatile?: boolean } = {},
): void {
  const z = state.zones[zoneId];
  const skip = opts.skipVolatile ? (opts.volatileIndices ?? []) : [];
  let placed = 0;
  for (let i = 0; i < z.slots.length && placed < n; i++) {
    if (skip.includes(i)) continue;
    if (z.slots[i] !== null) continue;
    z.slots[i] = { playerId: pid, isMajority: false };
    placed++;
  }
}
