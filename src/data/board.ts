import type { Zone } from "@/engine/types";

// PLACEHOLDER: minimal viable 3x3 board so the engine compiles. The data
// agent replaces this with tuned capacities, majority thresholds, adjacency,
// and 11 distributed Volatile Areas per the rulebook.
//
// Adjacency is 4-connected on the 3x3 grid:
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
    { id: "nw", name: "North-West", capacity: 11, majorityRequirement: 6, adjacent: ["n", "w"], volatileSlotIndices: [3] },
    { id: "n",  name: "North",      capacity: 9,  majorityRequirement: 5, adjacent: ["nw", "ne", "c"], volatileSlotIndices: [2] },
    { id: "ne", name: "North-East", capacity: 11, majorityRequirement: 6, adjacent: ["n", "e"], volatileSlotIndices: [4] },
    { id: "w",  name: "West",       capacity: 9,  majorityRequirement: 5, adjacent: ["nw", "sw", "c"], volatileSlotIndices: [1] },
    { id: "c",  name: "Central",    capacity: 13, majorityRequirement: 7, adjacent: ["n", "s", "w", "e"], volatileSlotIndices: [5, 7] },
    { id: "e",  name: "East",       capacity: 9,  majorityRequirement: 5, adjacent: ["ne", "se", "c"], volatileSlotIndices: [6] },
    { id: "sw", name: "South-West", capacity: 11, majorityRequirement: 6, adjacent: ["w", "s"], volatileSlotIndices: [2] },
    { id: "s",  name: "South",      capacity: 9,  majorityRequirement: 5, adjacent: ["sw", "se", "c"], volatileSlotIndices: [3] },
    { id: "se", name: "South-East", capacity: 11, majorityRequirement: 6, adjacent: ["s", "e"], volatileSlotIndices: [5] },
  ],
};

export function getZone(zoneId: string): Zone {
  const z = BOARD.zones.find((z) => z.id === zoneId);
  if (!z) throw new Error(`Unknown zone: ${zoneId}`);
  return z;
}
