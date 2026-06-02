import type {
  GameState,
  Player,
  PlayerColor,
  Resource,
  ZoneState,
  Slot,
} from "./types";
import { generateBoard, originalBoard } from "@/engine/board/generate";
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

export type MapMode = "original" | "dynamic";

export function createInitialState(args: {
  players: { name: string; color: PlayerColor }[];
  seed?: number;
  removeSensitive?: boolean;
  mapMode?: MapMode;
}): GameState {
  if (args.players.length < 2 || args.players.length > 5) {
    throw new Error("SHASN supports 2–5 players");
  }
  const seed = args.seed ?? (Math.floor(Math.random() * 0xffffffff) || 1);
  const removeSensitive = args.removeSensitive ?? false;
  const mapMode: MapMode = args.mapMode ?? "dynamic";

  // Pick this game's region map. "original" is the fixed published layout;
  // "dynamic" carves fresh random regions. Either way card shuffles continue
  // from `seedAfterBoard` so setup stays deterministic from `seed`.
  const { board, seedAfterBoard } =
    mapMode === "original"
      ? { board: originalBoard(), seedAfterBoard: seed }
      : (() => {
          const g = generateBoard(seed);
          return { board: g.board, seedAfterBoard: g.nextSeed };
        })();

  // Every player starts with zero resources. The rulebook's staggered
  // P1=1..P5=5 offset is deliberately dropped in favour of a clean start;
  // first-player advantage is small enough at this scope.
  const players: Player[] = args.players.map((p, i) => ({
    id: `p${i + 1}`,
    name: p.name,
    color: p.color,
    resources: { ...ZERO_RES },
    resourceCap: 12,
    ideologyCards: [],
    conspiracyHand: [],
    iouOwed: 0,
  }));

  // Zones — one empty ZoneState per generated zone.
  const zones: Record<string, ZoneState> = {};
  for (const z of board.zones) {
    zones[z.id] = emptyZone(z.capacity);
  }

  // Decks. Filter sensitive ideology cards if requested.
  const ideologyPool = IDEOLOGY_CARDS
    .filter((c) => !(removeSensitive && c.advisory))
    .map((c) => c.id);
  const voterPool = VOTER_CARDS.map((c) => c.id);
  const conspiracyPool = CONSPIRACY_CARDS.map((c) => c.id);
  const headlinePool = HEADLINE_CARDS.map((c) => c.id);

  let s = seedAfterBoard;
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
    board,
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
