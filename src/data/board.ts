import type { Zone, BoardLayout } from "@/engine/types";

// 9-zone TEMPLATE for the SHASN board. This file no longer describes the
// *geography* of the board — region shapes, positions, adjacency, colours and
// the exact volatile cells are generated fresh per game (see
// `src/engine/board/generate.ts`) and stored on `GameState.board`. What stays
// fixed every game is the set of zone *specs* below: the voter counts
// (capacities) and majority targets the user wants preserved.
//
//   - Four corner zones (nw, ne, sw, se): 11 voter slots each.
//     The northern corners are open (majority = 6 of 11), the southern
//     corners are harder to lock down (majority = 8 of 11).
//   - Four edge zones (n, w, e, s): 21 voter slots each, majority 11.
//   - One central zone (c): 16 voter slots, majority 8.
//
// Total = 4*11 + 4*21 + 16 = 144 voter slots. 11 Volatile Areas (the generator
// reads only the *count* per zone from `volatileSlotIndices.length`, then picks
// fresh cells). The `adjacent` / `volatileSlotIndices` values here are only the
// initial template; the generator overwrites them with per-game geography.

export interface Board {
  zones: Zone[];
}

// The fixed template (capacities, majority targets, names, volatile counts).
export const BOARD: Board = {
  zones: [
    {
      id: "nw",
      name: "Northern Hills",
      capacity: 11,
      majorityRequirement: 6,
      adjacent: ["n", "w"],
      volatileSlotIndices: [5],
    },
    {
      id: "n",
      name: "The Northlands",
      capacity: 21,
      majorityRequirement: 11,
      adjacent: ["nw", "ne", "c"],
      volatileSlotIndices: [4, 16],
    },
    {
      id: "ne",
      name: "Borderwatch",
      capacity: 11,
      majorityRequirement: 6,
      adjacent: ["n", "e"],
      volatileSlotIndices: [6],
    },
    {
      id: "w",
      name: "Western Reach",
      capacity: 21,
      majorityRequirement: 11,
      adjacent: ["nw", "sw", "c"],
      volatileSlotIndices: [9],
    },
    {
      id: "c",
      name: "The Capital",
      capacity: 16,
      majorityRequirement: 8,
      adjacent: ["n", "s", "w", "e"],
      volatileSlotIndices: [5],
    },
    {
      id: "e",
      name: "Eastern Ports",
      capacity: 21,
      majorityRequirement: 11,
      adjacent: ["ne", "se", "c"],
      volatileSlotIndices: [3, 14],
    },
    {
      id: "sw",
      name: "Southern Plains",
      capacity: 11,
      majorityRequirement: 8,
      adjacent: ["w", "s"],
      volatileSlotIndices: [4],
    },
    {
      id: "s",
      name: "The Heartland",
      capacity: 21,
      majorityRequirement: 11,
      adjacent: ["sw", "se", "c"],
      volatileSlotIndices: [10],
    },
    {
      id: "se",
      name: "Coastal Delta",
      capacity: 11,
      majorityRequirement: 8,
      adjacent: ["s", "e"],
      volatileSlotIndices: [6],
    },
  ],
};

// The fixed multiset of zone specs, used as input to the board generator.
export const ZONE_TEMPLATE: readonly Zone[] = BOARD.zones;

// Look up a zone definition on a per-game generated board.
export function getZone(board: BoardLayout, zoneId: string): Zone {
  const z = board.zones.find((z) => z.id === zoneId);
  if (!z) throw new Error(`Unknown zone: ${zoneId}`);
  return z;
}
