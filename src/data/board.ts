import type { Zone } from "@/engine/types";

// 9-zone hex-tile board, matching the published SHASN board:
//
//   - Four corner zones (nw, ne, sw, se): 11 hex tiles each.
//     The northern corners are open (majority = 6 of 11), the southern
//     corners are harder to lock down (majority = 8 of 11).
//   - Four edge zones (n, w, e, s): 21 hex tiles each, majority 11.
//   - One central zone (c): 16 hex tiles, majority 8.
//
// Total = 4*11 + 4*21 + 16 = 144 hex tiles. 11 Volatile Areas distributed
// across the 9 zones per the rulebook.
//
// Adjacency is the natural 8-neighbour on the 3x3 zone arrangement
// reduced to orthogonal: nw-n, n-ne, nw-w, n-c, ne-e, w-c, c-e, w-sw,
// c-s, e-se, sw-s, s-se.
//
//   nw - n - ne
//   |    |    |
//   w  - c -  e
//   |    |    |
//   sw - s - se

export interface Board {
  zones: Zone[];
}

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

export function getZone(zoneId: string): Zone {
  const z = BOARD.zones.find((z) => z.id === zoneId);
  if (!z) throw new Error(`Unknown zone: ${zoneId}`);
  return z;
}
