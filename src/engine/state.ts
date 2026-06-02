import type {
  GameState,
  Player,
  Ideologue,
  Resource,
  ZoneState,
  Slot,
} from "./types";
import { BOARD } from "@/data/board";
import { IDEOLOGY_CARDS } from "@/data/cards/ideology";
import { VOTER_CARDS } from "@/data/cards/voter";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";
import { HEADLINE_CARDS } from "@/data/cards/headline";
import { shuffle } from "./rng";

const ZERO_RES: Record<Resource, number> = { funds: 0, clout: 0, media: 0, trust: 0 };

function emptyZone(capacity: number): ZoneState {
  const slots: Slot[] = new Array(capacity).fill(null);
  return { slots, majorityHolder: null };
}

export function createInitialState(args: {
  players: { name: string; color: Ideologue }[];
  seed?: number;
  removeSensitive?: boolean;
}): GameState {
  if (args.players.length < 2 || args.players.length > 5) {
    throw new Error("SHASN supports 2–5 players");
  }
  const seed = args.seed ?? (Math.floor(Math.random() * 0xffffffff) || 1);
  const removeSensitive = args.removeSensitive ?? false;

  // Players + starting resources (P1: 1, P2: 2, ... P5: 5) — but starting
  // resource choice is interactive in the rules; for setup we hand them out
  // as `any` resource tokens via a setup-time auto-distribution that the UI
  // can override. For v1 we just default to funds.
  const players: Player[] = args.players.map((p, i) => {
    const startingCount = i + 1;
    return {
      id: `p${i + 1}`,
      name: p.name,
      color: p.color,
      // Default: all starting resources as `funds`. The UI can immediately
      // dispatch a `chooseAnyResource`-style mutation if a richer setup flow
      // is desired; the rulebook only requires that totals equal startingCount.
      resources: { ...ZERO_RES, funds: startingCount },
      resourceCap: 12,
      ideologyCards: [],
      conspiracyHand: [],
      iouOwed: 0,
    };
  });

  // Zones
  const zones: Record<string, ZoneState> = {};
  for (const z of BOARD.zones) {
    zones[z.id] = emptyZone(z.capacity);
  }

  // Decks. Filter sensitive ideology cards if requested.
  const ideologyPool = IDEOLOGY_CARDS
    .filter((c) => !(removeSensitive && c.advisory))
    .map((c) => c.id);
  const voterPool = VOTER_CARDS.map((c) => c.id);
  const conspiracyPool = CONSPIRACY_CARDS.map((c) => c.id);
  const headlinePool = HEADLINE_CARDS.map((c) => c.id);

  let s = seed;
  const idShuf = shuffle(ideologyPool, s); s = idShuf.nextSeed;
  const voShuf = shuffle(voterPool, s);    s = voShuf.nextSeed;
  const coShuf = shuffle(conspiracyPool, s); s = coShuf.nextSeed;
  const heShuf = shuffle(headlinePool, s); s = heShuf.nextSeed;

  // Three face-up voter cards
  const open: [string | null, string | null, string | null] = [
    voShuf.shuffled.shift() ?? null,
    voShuf.shuffled.shift() ?? null,
    voShuf.shuffled.shift() ?? null,
  ];

  return {
    phase: "handoff",
    players,
    activePlayerIdx: 0,
    turn: 1,
    zones,
    decks: {
      ideology: idShuf.shuffled,           ideologyDiscard: [],
      voter: voShuf.shuffled,              voterDiscard: [],
      conspiracy: coShuf.shuffled,         conspiracyDiscard: [],
      headline: heShuf.shuffled,           headlineDiscard: [],
    },
    openVoterCards: open,
    currentIdeologyCard: null,
    pendingPlacements: [],
    pendingHeadlines: 0,
    powerUsage: {},
    rngSeed: s,
    removeSensitive,
    log: [],
  };
}
