// The procedural board generator must always produce a board with the FIXED
// voter counts (region capacities + majority targets) the game depends on,
// while the geography itself is randomized and reproducible from the seed.

import { describe, it, expect } from "vitest";
import { generateBoard } from "@/engine/board/generate";
import { ZONE_TEMPLATE } from "@/data/board";
import type { BoardLayout } from "@/engine/types";

const SEEDS = [1, 42, 7, 1234, 99999, 0x7fffffff];

function cellKey(c: { col: number; row: number }): string {
  return `${c.col},${c.row}`;
}

// odd-r offset neighbours (must match the generator).
const ODDR: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]],
  [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]],
];

function isContiguous(cells: { col: number; row: number }[]): boolean {
  if (cells.length === 0) return true;
  const set = new Set(cells.map(cellKey));
  const seen = new Set<string>();
  const stack = [cells[0]];
  seen.add(cellKey(cells[0]));
  while (stack.length) {
    const cur = stack.pop()!;
    for (const [dc, dr] of ODDR[cur.row & 1]) {
      const nk = `${cur.col + dc},${cur.row + dr}`;
      if (set.has(nk) && !seen.has(nk)) {
        seen.add(nk);
        stack.push({ col: cur.col + dc, row: cur.row + dr });
      }
    }
  }
  return seen.size === set.size;
}

function checkBoard(board: BoardLayout) {
  // Nine zones, ids match the template.
  expect(board.zones).toHaveLength(9);
  expect(board.zones.map((z) => z.id).sort()).toEqual(
    ZONE_TEMPLATE.map((z) => z.id).sort(),
  );

  // Capacities + majority targets exactly match the template multiset.
  const specOf = new Map(ZONE_TEMPLATE.map((z) => [z.id, z]));
  let totalCells = 0;
  let totalVolatile = 0;
  const allCells = new Set<string>();
  for (const z of board.zones) {
    const spec = specOf.get(z.id)!;
    expect(z.capacity).toBe(spec.capacity);
    expect(z.majorityRequirement).toBe(spec.majorityRequirement);

    const geo = board.geometry[z.id];
    expect(geo.cells).toHaveLength(z.capacity); // one hex per voter slot
    expect(isContiguous(geo.cells)).toBe(true); // region is connected
    expect(z.volatileSlotIndices.length).toBe(spec.volatileSlotIndices.length);
    for (const vi of z.volatileSlotIndices) {
      expect(vi).toBeGreaterThanOrEqual(0);
      expect(vi).toBeLessThan(z.capacity);
    }

    totalCells += geo.cells.length;
    totalVolatile += z.volatileSlotIndices.length;
    for (const c of geo.cells) allCells.add(cellKey(c));
  }

  // Full, non-overlapping coverage of all 144 cells, 11 volatile total.
  expect(totalCells).toBe(144);
  expect(allCells.size).toBe(144);
  expect(totalVolatile).toBe(11);

  // Adjacency is symmetric and references real zones.
  const ids = new Set(board.zones.map((z) => z.id));
  for (const z of board.zones) {
    for (const aid of z.adjacent) {
      expect(ids.has(aid)).toBe(true);
      const other = board.zones.find((zz) => zz.id === aid)!;
      expect(other.adjacent).toContain(z.id);
    }
  }
}

describe("generateBoard", () => {
  it("produces a valid board with fixed voter counts for many seeds", () => {
    for (const seed of SEEDS) {
      checkBoard(generateBoard(seed).board);
    }
  });

  it("is deterministic — same seed yields an identical board", () => {
    const a = generateBoard(42);
    const b = generateBoard(42);
    expect(JSON.stringify(a.board)).toBe(JSON.stringify(b.board));
    expect(a.nextSeed).toBe(b.nextSeed);
  });

  it("varies geography across seeds", () => {
    const a = JSON.stringify(generateBoard(1).board.geometry);
    const b = JSON.stringify(generateBoard(2).board.geometry);
    expect(a).not.toBe(b);
  });
});
