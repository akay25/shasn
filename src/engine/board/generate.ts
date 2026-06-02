// Board layouts. Both the fixed "original" board and the random "dynamic" board
// are carved from the SAME substrate: a horizontal hex DIAMOND of 129 cells
// that mirrors the silhouette of the published SHASN board (actual_map.jpg).
//
// The voter counts are fixed by the template (corners 11, N/S 21, E/W 17,
// Capital 9 — total 129) with their majority targets. Only the geography
// changes:
//   - originalBoard(): a deterministic partition with regions in their
//     canonical positions (N top, S bottom, E right, W left, Capital centre,
//     corners at the corners) — looks the same every game, like the real board.
//   - generateBoard(seed): a randomized partition — fresh region shapes,
//     adjacency, volatile cells and colours each game.
//
// Both use seeded region-growing over the diamond field; the original just
// pins the seeds to canonical positions and uses a fixed RNG so it never
// varies.

import type { BoardLayout, HexCell, Zone, ZoneGeometry } from "@/engine/types";
import { ZONE_TEMPLATE } from "@/data/board";
import { mulberry32 } from "@/engine/rng";

// ---- Substrate: the 129-cell horizontal diamond ---------------------------

// Per-row widths, symmetric top↔bottom, widest in the middle → a lens/diamond
// that is wider (21) than tall (9). Sum = 129 = the template's total capacity.
const ROW_WIDTHS = [9, 13, 15, 17, 21, 17, 15, 13, 9];
const FIELD_MAXW = Math.max(...ROW_WIDTHS);

// odd-r offset neighbour deltas (pointy-top; odd rows shifted right).
const ODDR: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]], // even rows
  [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]], // odd rows
];

interface Field {
  cells: HexCell[];          // canonical cell list (index === position here)
  neighbors: number[][];     // cell index -> neighbouring cell indices
  index: Map<string, number>; // "col,row" -> cell index
  cols: number;
  rows: number;
}

const FIELD: Field = buildDiamondField();

function buildDiamondField(): Field {
  const cells: HexCell[] = [];
  ROW_WIDTHS.forEach((w, row) => {
    const start = Math.floor((FIELD_MAXW - w) / 2);
    for (let c = 0; c < w; c++) cells.push({ col: start + c, row });
  });
  const index = new Map<string, number>();
  cells.forEach((c, i) => index.set(`${c.col},${c.row}`, i));
  const neighbors = cells.map((c) => {
    const out: number[] = [];
    for (const [dc, dr] of ODDR[c.row & 1]) {
      const j = index.get(`${c.col + dc},${c.row + dr}`);
      if (j !== undefined) out.push(j);
    }
    return out;
  });
  let cols = 0;
  let rows = 0;
  for (const c of cells) {
    cols = Math.max(cols, c.col + 1);
    rows = Math.max(rows, c.row + 1);
  }
  return { cells, neighbors, index, cols, rows };
}

// ---- Palette ---------------------------------------------------------------

// Muted pastel terrain fills in the spirit of the printed board. Greedy-coloured
// so adjacent regions differ.
const PALETTE = [
  "#c9c0a6", // sand
  "#b8c7bd", // sage
  "#cdbfae", // taupe
  "#bcc6cf", // slate
  "#cabfc4", // mauve
  "#c2cab0", // olive-grey
  "#d2c7b0", // wheat
  "#b9c2c4", // stone-blue
  "#cdc3b2", // oat
];

// ---- Region growing --------------------------------------------------------

interface Partition {
  owner: Int32Array;          // cell index -> region index, -1 unassigned
  cellsByRegion: number[][];  // region index -> ordered cell indices
}

// Grow `sizes.length` regions to their exact sizes from the given seed cells
// (random spread if seeds omitted). Returns null if any region gets boxed in.
function growRegions(
  sizes: number[],
  rng: () => number,
  seedCells?: number[],
): Partition | null {
  const N = FIELD.cells.length;
  const n = sizes.length;
  const owner = new Int32Array(N).fill(-1);
  const cellsByRegion: number[][] = Array.from({ length: n }, () => []);
  const remaining = sizes.slice();
  const frontier: number[][] = Array.from({ length: n }, () => []);

  const seeds = seedCells ? seedCells.slice() : spreadSeeds(n, rng);
  for (let r = 0; r < n; r++) {
    const s = seeds[r];
    owner[s] = r;
    cellsByRegion[r].push(s);
    remaining[r]--;
    for (const nb of FIELD.neighbors[s]) if (owner[nb] === -1) frontier[r].push(nb);
  }

  let assigned = n;
  while (assigned < N) {
    // Grow the most-constrained needy region (smallest live frontier). A needy
    // region with no live frontier is boxed in → abort.
    let pick = -1;
    let pickFrontier = Infinity;
    for (let r = 0; r < n; r++) {
      if (remaining[r] <= 0) continue;
      const live = pruneFrontier(frontier[r], owner);
      if (live.length === 0) return null;
      if (live.length < pickFrontier) {
        pickFrontier = live.length;
        pick = r;
      }
    }
    if (pick === -1) break;

    const live = frontier[pick];
    const choice = live[Math.floor(rng() * live.length)];
    owner[choice] = pick;
    cellsByRegion[pick].push(choice);
    remaining[pick]--;
    for (const nb of FIELD.neighbors[choice]) if (owner[nb] === -1) frontier[pick].push(nb);
    assigned++;
  }

  for (let r = 0; r < n; r++) if (remaining[r] !== 0) return null;
  for (let c = 0; c < N; c++) if (owner[c] === -1) return null;
  return { owner, cellsByRegion };
}

// Farthest-point sampling: spread `n` seeds across the field.
function spreadSeeds(n: number, rng: () => number): number[] {
  const N = FIELD.cells.length;
  const seeds: number[] = [Math.floor(rng() * N)];
  while (seeds.length < n) {
    let best = -1;
    let bestDist = -1;
    for (let tries = 0; tries < 64; tries++) {
      const cand = Math.floor(rng() * N);
      if (seeds.includes(cand)) continue;
      let d = Infinity;
      for (const s of seeds) d = Math.min(d, cellDist(cand, s));
      if (d > bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    if (best === -1) for (let c = 0; c < N; c++) if (!seeds.includes(c)) { best = c; break; }
    seeds.push(best);
  }
  return seeds;
}

function pruneFrontier(f: number[], owner: Int32Array): number[] {
  let w = 0;
  for (let i = 0; i < f.length; i++) if (owner[f[i]] === -1) f[w++] = f[i];
  f.length = w;
  return f;
}

function cellDist(a: number, b: number): number {
  const ca = FIELD.cells[a];
  const cb = FIELD.cells[b];
  const [aq, ar] = oddrToAxial(ca.col, ca.row);
  const [bq, br] = oddrToAxial(cb.col, cb.row);
  return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs(aq + ar - bq - br)) / 2;
}

function oddrToAxial(col: number, row: number): [number, number] {
  return [col - (row - (row & 1)) / 2, row];
}

// ---- Assemble a BoardLayout from a partition -------------------------------

function buildLayout(part: Partition, regionSpec: Zone[]): BoardLayout {
  const { owner, cellsByRegion } = part;
  const n = cellsByRegion.length;

  // Adjacency from geography.
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (let c = 0; c < FIELD.cells.length; c++) {
    const a = owner[c];
    if (a < 0) continue;
    for (const nb of FIELD.neighbors[c]) {
      const b = owner[nb];
      if (b >= 0 && b !== a) {
        adj[a].add(b);
        adj[b].add(a);
      }
    }
  }

  // Greedy graph-colour so neighbours differ.
  const colorIdx = new Array(n).fill(-1);
  for (let r = 0; r < n; r++) {
    const used = new Set<number>();
    for (const m of adj[r]) if (colorIdx[m] >= 0) used.add(colorIdx[m]);
    let ci = 0;
    while (used.has(ci)) ci++;
    colorIdx[r] = ci % PALETTE.length;
  }

  const zones: Zone[] = [];
  const geometry: Record<string, ZoneGeometry> = {};
  for (let r = 0; r < n; r++) {
    const spec = regionSpec[r];
    const cells: HexCell[] = cellsByRegion[r].map((i) => ({ ...FIELD.cells[i] }));
    const adjacent = [...adj[r]].map((m) => regionSpec[m].id).sort();
    const count = spec.volatileSlotIndices.length;
    const volatileSlotIndices = pickDistinct(cells.length, count, r).sort((a, b) => a - b);

    zones.push({
      id: spec.id,
      name: spec.name,
      capacity: spec.capacity,
      majorityRequirement: spec.majorityRequirement,
      adjacent,
      volatileSlotIndices,
    });

    const centroid = cells.reduce(
      (acc, h) => ({ col: acc.col + h.col, row: acc.row + h.row }),
      { col: 0, row: 0 },
    );
    centroid.col /= cells.length;
    centroid.row /= cells.length;
    geometry[spec.id] = { cells, centroid, color: PALETTE[colorIdx[r]] };
  }

  zones.sort((a, b) => templateOrder(a.id) - templateOrder(b.id));
  return { zones, geometry, cols: FIELD.cols, rows: FIELD.rows };
}

function templateOrder(id: string): number {
  return ZONE_TEMPLATE.findIndex((z) => z.id === id);
}

// Deterministic volatile-cell pick: spread `count` indices across [0,range).
function pickDistinct(range: number, count: number, salt: number): number[] {
  if (count <= 0) return [];
  const step = Math.max(1, Math.floor(range / count));
  const out: number[] = [];
  for (let k = 0; k < count; k++) out.push((salt * 3 + 1 + k * step) % range);
  return [...new Set(out)].slice(0, count);
}

// Spec matching for the dynamic board: assign template specs to regions by
// capacity (shuffled within equal-capacity groups for variety).
function specsByCapacity(part: Partition, rng: () => number): Zone[] {
  const bySize = new Map<number, Zone[]>();
  for (const spec of ZONE_TEMPLATE) {
    const arr = bySize.get(spec.capacity) ?? [];
    arr.push(spec);
    bySize.set(spec.capacity, arr);
  }
  for (const arr of bySize.values()) shuffleInPlace(arr, rng);
  return part.cellsByRegion.map((cells) => bySize.get(cells.length)!.pop()!);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---- Dynamic (random) board ------------------------------------------------

const MAX_ATTEMPTS = 120;

export function generateBoard(seed: number): { board: BoardLayout; nextSeed: number } {
  const rng = mulberry32(seed >>> 0);
  const sizes = ZONE_TEMPLATE.map((z) => z.capacity);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const part = growRegions(sizes, rng);
    if (part) {
      const board = buildLayout(part, specsByCapacity(part, rng));
      const nextSeed = (Math.floor(rng() * 0xffffffff) >>> 0) || 1;
      return { board, nextSeed };
    }
  }
  const part = serpentinePartition(sizes);
  const board = buildLayout(part, specsByCapacity(part, rng));
  const nextSeed = (Math.floor(rng() * 0xffffffff) >>> 0) || 1;
  return { board, nextSeed };
}

// ---- Original (fixed, canonical) board -------------------------------------

// Canonical seed positions on the diamond (centre ≈ col 10, row 4), in the
// template's id order, so each region grows in its real-board location.
const CANONICAL_SEEDS: Record<string, { col: number; row: number }> = {
  nw: { col: 6, row: 1 },
  n: { col: 10, row: 1 },
  ne: { col: 14, row: 1 },
  w: { col: 3, row: 4 },
  c: { col: 10, row: 4 },
  e: { col: 17, row: 4 },
  sw: { col: 6, row: 7 },
  s: { col: 10, row: 7 },
  se: { col: 14, row: 7 },
};

export function originalBoard(): BoardLayout {
  const specs = ZONE_TEMPLATE.slice();
  const sizes = specs.map((z) => z.capacity);
  const seedCells = specs.map((z) => nearestFieldCell(CANONICAL_SEEDS[z.id]));

  // Deterministic: try a sequence of fixed RNG seeds until one partitions
  // cleanly with the pinned seed cells. Always reproducible.
  for (let s = 1; s <= 400; s++) {
    const part = growRegions(sizes, mulberry32(s), seedCells);
    if (part) return buildLayout(part, specs.slice());
  }
  return buildLayout(serpentinePartition(sizes), specs.slice());
}

function nearestFieldCell(target: { col: number; row: number }): number {
  let best = 0;
  let bestD = Infinity;
  FIELD.cells.forEach((c, i) => {
    const d = Math.hypot(c.col - target.col, c.row - target.row);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

// ---- Fallback partition (deterministic, always valid) ----------------------

function serpentinePartition(sizes: number[]): Partition {
  const N = FIELD.cells.length;
  const owner = new Int32Array(N).fill(-1);
  const cellsByRegion: number[][] = Array.from({ length: sizes.length }, () => []);
  // Serpentine cell order (row-major, alternating direction) keeps each
  // size-run contiguous.
  const order: number[] = [];
  for (let row = 0; row < FIELD.rows; row++) {
    const rowCells: number[] = [];
    FIELD.cells.forEach((c, i) => {
      if (c.row === row) rowCells.push(i);
    });
    rowCells.sort((a, b) => FIELD.cells[a].col - FIELD.cells[b].col);
    if (row & 1) rowCells.reverse();
    order.push(...rowCells);
  }
  let pos = 0;
  for (let r = 0; r < sizes.length; r++) {
    for (let k = 0; k < sizes[r]; k++) {
      const cell = order[pos++];
      owner[cell] = r;
      cellsByRegion[r].push(cell);
    }
  }
  return { owner, cellsByRegion };
}
