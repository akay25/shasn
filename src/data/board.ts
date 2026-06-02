import type { Zone } from "@/engine/types";

// 9-zone 3x3 grid used as a stand-in for the physical SHASN board until the
// retail board is photographed. Capacities are tuned so that:
//
//   - the four corner zones hold 9 voters,
//   - the four edge zones hold 11 voters,
//   - the central zone holds 13 voters,
//
// for a total of 93 voter slots — close to the ~90 slot count implied by the
// rulebook. Each majority requirement is `floor(capacity / 2) + 1`, matching
// the rulebook's "more than half" rule (e.g. 6 of 11).
//
// Adjacency is 4-connected on the grid:
//   nw - n - ne
//   |    |    |
//   w  - c -  e
//   |    |    |
//   sw - s - se
//
// 11 Volatile Areas are distributed across the 9 zones (the rulebook count),
// at varied slot indices so that the volatile positions are not all clustered
// at the same offset within each zone.

export interface Board {
  zones: Zone[];
}

export const BOARD: Board = {
  zones: [
    {
      id: "nw",
      name: "Northern Hills",
      capacity: 9,
      majorityRequirement: 5,
      adjacent: ["n", "w"],
      volatileSlotIndices: [4],
    },
    {
      id: "n",
      name: "The Northlands",
      capacity: 11,
      majorityRequirement: 6,
      adjacent: ["nw", "ne", "c"],
      volatileSlotIndices: [2, 8],
    },
    {
      id: "ne",
      name: "Borderwatch",
      capacity: 9,
      majorityRequirement: 5,
      adjacent: ["n", "e"],
      volatileSlotIndices: [5],
    },
    {
      id: "w",
      name: "Western Reach",
      capacity: 11,
      majorityRequirement: 6,
      adjacent: ["nw", "sw", "c"],
      volatileSlotIndices: [3],
    },
    {
      id: "c",
      name: "The Capital",
      capacity: 13,
      majorityRequirement: 7,
      adjacent: ["n", "s", "w", "e"],
      volatileSlotIndices: [6, 9],
    },
    {
      id: "e",
      name: "Eastern Ports",
      capacity: 11,
      majorityRequirement: 6,
      adjacent: ["ne", "se", "c"],
      volatileSlotIndices: [7],
    },
    {
      id: "sw",
      name: "Southern Plains",
      capacity: 9,
      majorityRequirement: 5,
      adjacent: ["w", "s"],
      volatileSlotIndices: [4],
    },
    {
      id: "s",
      name: "The Heartland",
      capacity: 11,
      majorityRequirement: 6,
      adjacent: ["sw", "se", "c"],
      volatileSlotIndices: [10],
    },
    {
      id: "se",
      name: "Coastal Delta",
      capacity: 9,
      majorityRequirement: 5,
      adjacent: ["s", "e"],
      volatileSlotIndices: [3],
    },
  ],
};

export function getZone(zoneId: string): Zone {
  const z = BOARD.zones.find((z) => z.id === zoneId);
  if (!z) throw new Error(`Unknown zone: ${zoneId}`);
  return z;
}
