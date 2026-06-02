import type { Zone, BoardLayout } from "@/engine/types";

// 9-zone TEMPLATE for the SHASN board, matching the published board's voter
// counts (see actual_map.jpg). This file no longer describes the *geography* —
// region shapes, positions, adjacency, colours and the exact volatile cells are
// produced per game (see `src/engine/board/generate.ts`) and stored on
// `GameState.board`, either as the fixed "original" layout or a random
// "dynamic" one. What stays fixed every game is the set of zone *specs* below:
// the voter counts (capacities) and majority targets shown on the real board.
//
//   - Four corner zones (nw, ne, sw, se): 11 voter slots, majority 6.
//   - North & South (n, s): 21 voter slots, majority 11.
//   - East & West (e, w): 17 voter slots, majority 9.
//   - The Capital (c): 9 voter slots, majority 5.
//
// Total = 4*11 + 2*21 + 2*17 + 9 = 129 voter slots. 11 Volatile Areas (the
// generator reads only the *count* per zone from `volatileSlotIndices.length`,
// then picks fresh cells). The `adjacent` / `volatileSlotIndices` values here
// are only the template; the generator overwrites them with per-game geography.

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
      capacity: 17,
      majorityRequirement: 9,
      adjacent: ["nw", "sw", "c"],
      volatileSlotIndices: [9],
    },
    {
      id: "c",
      name: "The Capital",
      capacity: 9,
      majorityRequirement: 5,
      adjacent: ["n", "s", "w", "e"],
      volatileSlotIndices: [5],
    },
    {
      id: "e",
      name: "Eastern Ports",
      capacity: 17,
      majorityRequirement: 9,
      adjacent: ["ne", "se", "c"],
      volatileSlotIndices: [3, 14],
    },
    {
      id: "sw",
      name: "Southern Plains",
      capacity: 11,
      majorityRequirement: 6,
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
      majorityRequirement: 6,
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
