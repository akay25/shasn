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

  // Staggered starting resources from the rulebook (Objective & Setup):
  // P1 gets 1 resource, P2 gets 2, …, P5 gets 5 — to offset first-player
  // advantage. The rulebook lets each player CHOOSE which resources to
  // take; we default to a cyclic distribution across funds/clout/media/
  // trust so no one starts loaded in a single type. A future Setup UX can
  // expose a per-player picker.
  const STARTING_RESOURCE_ORDER: Resource[] = ["funds", "clout", "media", "trust"];
  const players: Player[] = args.players.map((p, i) => {
    const startingCount = i + 1;
    const resources: Record<Resource, number> = { ...ZERO_RES };
    for (let k = 0; k < startingCount; k++) {
      const r = STARTING_RESOURCE_ORDER[k % STARTING_RESOURCE_ORDER.length];
      resources[r] += 1;
    }
    return {
      id: `p${i + 1}`,
      name: p.name,
      color: p.color,
      resources,
      resourceCap: 12,
      ideologyCards: [],
      conspiracyHand: [],
      iouOwed: 0,
    };
  });

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
