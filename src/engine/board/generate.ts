// Procedural board generator.
//
// Produces a fresh `BoardLayout` every game: nine organic, contiguous regions
// carved out of a horizontal rhombus of 144 hexes. The *voter counts* are
// fixed — the region sizes always equal the template capacities
// {11,11,11,11,21,21,21,21,16} with their majority targets — but the shapes,
// positions, adjacency, volatile cells and colours are randomized (seeded, so
// a game is reproducible from its seed).
//
// Strategy: lay a full COLS×ROWS parallelogram of hexes (exactly 144 cells, so
// the substrate is always fully connected), then partition it into nine
// contiguous regions of the target sizes via seeded multi-source region
// growing. If a region gets boxed in before reaching its size the attempt is
// abandoned and retried with a fresh draw; after a cap we fall back to a fixed
// hand-made layout so a game can always start.

import type { BoardLayout, HexCell, Zone, ZoneGeometry } from "@/engine/types";
import { ZONE_TEMPLATE } from "@/data/board";
import { mulberry32 } from "@/engine/rng";

// ---- Substrate -------------------------------------------------------------

const COLS = 16;
const ROWS = 9; // 16 * 9 = 144 — wider than tall → horizontal rhombus
const TOTAL = COLS * ROWS;

// odd-r offset neighbour deltas (pointy-top; odd rows shifted right).
const ODDR_NEIGHBORS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
  // even rows
  [[+1, 0], [0, -1], [-1, -1], [-1, 0], [-1, +1], [0, +1]],
  // odd rows
  [[+1, 0], [+1, -1], [0, -1], [-1, 0], [0, +1], [+1, +1]],
];

function idx(col: number, row: number): number {
  return row * COLS + col;
}

function neighborIndices(col: number, row: number): number[] {
  const out: number[] = [];
  for (const [dc, dr] of ODDR_NEIGHBORS[row & 1]) {
    const nc = col + dc;
    const nr = row + dr;
    if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS) out.push(idx(nc, nr));
  }
  return out;
}

// Precomputed neighbour lists for the whole substrate.
const NEIGHBORS: number[][] = (() => {
  const arr: number[][] = new Array(TOTAL);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) arr[idx(c, r)] = neighborIndices(c, r);
  }
  return arr;
})();

// ---- Palette ---------------------------------------------------------------

// Pastel terrain fills (matching the photographed board's mint / pink / wheat /
// slate-blue feel). Greedy-coloured so adjacent regions differ.
const PALETTE = [
  "#b6d6cf", // mint
  "#e4c4d2", // pink
  "#e6d2b4", // wheat
  "#c2d4e2", // light blue
  "#e8c8c0", // dusty rose
  "#cfe0c2", // sage
  "#dcc8e0", // lilac
  "#e8d6b0", // sand
  "#bcd0dc", // pale slate
];

// ---- Region growing --------------------------------------------------------

interface Attempt {
  owner: Int32Array;       // cell index -> region index (0..8), -1 unassigned
  cellsByRegion: number[][]; // region index -> ordered cell indices
}

// Run one partition attempt. Returns null if any region gets boxed in.
function growRegions(sizes: number[], rng: () => number): Attempt | null {
  const n = sizes.length;
  const owner = new Int32Array(TOTAL).fill(-1);
  const cellsByRegion: number[][] = Array.from({ length: n }, () => []);
  const remaining = sizes.slice();
  // Unassigned-neighbour frontier per region (stored as a plain array; we drop
  // stale entries lazily).
  const frontier: number[][] = Array.from({ length: n }, () => []);

  // Seed placement: farthest-point sampling with a random start, so seeds
  // spread out and regions rarely strangle each other.
  const seeds: number[] = [];
  const first = Math.floor(rng() * TOTAL);
  seeds.push(first);
  while (seeds.length < n) {
    let best = -1;
    let bestDist = -1;
    // Sample a subset of candidates for a cheap farthest-point pick.
    for (let tries = 0; tries < 64; tries++) {
      const cand = Math.floor(rng() * TOTAL);
      if (seeds.includes(cand)) continue;
      let d = Infinity;
      for (const s of seeds) d = Math.min(d, gridDist(cand, s));
      if (d > bestDist) {
        bestDist = d;
        best = cand;
      }
    }
    if (best === -1) {
      // Fallback: first unused cell.
      for (let c = 0; c < TOTAL; c++) if (!seeds.includes(c)) { best = c; break; }
    }
    seeds.push(best);
  }

  for (let r = 0; r < n; r++) {
    const s = seeds[r];
    owner[s] = r;
    cellsByRegion[r].push(s);
    remaining[r]--;
    for (const nb of NEIGHBORS[s]) if (owner[nb] === -1) frontier[r].push(nb);
  }

  let assigned = n;
  while (assigned < TOTAL) {
    // Pick the most-constrained growable region: smallest live frontier among
    // regions that still need cells. If a needy region has no live frontier,
    // it is boxed in → abort.
    let pick = -1;
    let pickFrontier = Infinity;
    for (let r = 0; r < n; r++) {
      if (remaining[r] <= 0) continue;
      const live = pruneFrontier(frontier[r], owner);
      if (live.length === 0) return null; // boxed in
      if (live.length < pickFrontier) {
        pickFrontier = live.length;
        pick = r;
      }
    }
    if (pick === -1) break; // nothing left needing cells

    const live = frontier[pick];
    const choice = live[Math.floor(rng() * live.length)];
    owner[choice] = pick;
    cellsByRegion[pick].push(choice);
    remaining[pick]--;
    for (const nb of NEIGHBORS[choice]) if (owner[nb] === -1) frontier[pick].push(nb);
    assigned++;
  }

  // Sanity: every region met its quota and every cell is assigned.
  for (let r = 0; r < n; r++) if (remaining[r] !== 0) return null;
  for (let c = 0; c < TOTAL; c++) if (owner[c] === -1) return null;
  return { owner, cellsByRegion };
}

// Drop assigned cells from a frontier array in place; return it.
function pruneFrontier(f: number[], owner: Int32Array): number[] {
  let w = 0;
  for (let i = 0; i < f.length; i++) {
    if (owner[f[i]] === -1) f[w++] = f[i];
  }
  f.length = w;
  return f;
}

function colOf(i: number): number { return i % COLS; }
function rowOf(i: number): number { return Math.floor(i / COLS); }

// Approximate hex distance via axial conversion of offset coords.
function gridDist(a: number, b: number): number {
  const [aq, ar] = oddrToAxial(colOf(a), rowOf(a));
  const [bq, br] = oddrToAxial(colOf(b), rowOf(b));
  return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs(aq + ar - bq - br)) / 2;
}

function oddrToAxial(col: number, row: number): [number, number] {
  const q = col - (row - (row & 1)) / 2;
  return [q, row];
}

// ---- Assembling the BoardLayout -------------------------------------------

function buildLayout(
  attempt: Attempt,
  cols: number,
  rows: number,
  rng: () => number,
): BoardLayout {
  const { owner, cellsByRegion } = attempt;
  const n = cellsByRegion.length;

  // Match template specs to regions by capacity (shuffle within equal-capacity
  // groups so which named zone lands where varies game to game).
  const specsBySize = new Map<number, Zone[]>();
  for (const spec of ZONE_TEMPLATE) {
    const arr = specsBySize.get(spec.capacity) ?? [];
    arr.push(spec);
    specsBySize.set(spec.capacity, arr);
  }
  for (const arr of specsBySize.values()) shuffleInPlace(arr, rng);

  const regionSpec: Zone[] = new Array(n);
  for (let r = 0; r < n; r++) {
    const size = cellsByRegion[r].length;
    const spec = specsBySize.get(size)!.pop()!;
    regionSpec[r] = spec;
  }

  // Region adjacency from geography: two regions touch if any of their cells
  // are hex neighbours.
  const adj: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (let c = 0; c < TOTAL; c++) {
    const a = owner[c];
    if (a < 0) continue;
    for (const nb of NEIGHBORS[c]) {
      const b = owner[nb];
      if (b >= 0 && b !== a) {
        adj[a].add(b);
        adj[b].add(a);
      }
    }
  }

  // Greedy graph-colour the regions so neighbours differ.
  const colorIdx = new Array(n).fill(-1);
  for (let r = 0; r < n; r++) {
    const used = new Set<number>();
    for (const m of adj[r]) if (colorIdx[m] >= 0) used.add(colorIdx[m]);
    let ci = 0;
    while (used.has(ci)) ci++;
    colorIdx[r] = ci % PALETTE.length;
  }

  // Build zones + geometry keyed by the template id.
  const zones: Zone[] = [];
  const geometry: Record<string, ZoneGeometry> = {};
  for (let r = 0; r < n; r++) {
    const spec = regionSpec[r];
    const cellIdxs = cellsByRegion[r];
    const cells: HexCell[] = cellIdxs.map((i) => ({ col: colOf(i), row: rowOf(i) }));

    // Adjacent zone ids.
    const adjacent = [...adj[r]].map((m) => regionSpec[m].id).sort();

    // Fresh volatile cells: pick `count` distinct slot indices.
    const count = spec.volatileSlotIndices.length;
    const volatileSlotIndices = pickDistinct(cells.length, count, rng).sort((a, b) => a - b);

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

  // Keep zones in the template's canonical id order for stable iteration.
  zones.sort((a, b) => templateOrder(a.id) - templateOrder(b.id));

  return { zones, geometry, cols, rows };
}

function templateOrder(id: string): number {
  return ZONE_TEMPLATE.findIndex((z) => z.id === id);
}

function pickDistinct(range: number, count: number, rng: () => number): number[] {
  const pool = Array.from({ length: range }, (_, i) => i);
  shuffleInPlace(pool, rng);
  return pool.slice(0, Math.min(count, range));
}

function shuffleInPlace<T>(arr: T[], rng: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---- Public entry point ----------------------------------------------------

const MAX_ATTEMPTS = 80;

export function generateBoard(seed: number): { board: BoardLayout; nextSeed: number } {
  const rng = mulberry32(seed >>> 0);
  const sizes = ZONE_TEMPLATE.map((z) => z.capacity);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = growRegions(sizes, rng);
    if (result) {
      const board = buildLayout(result, COLS, ROWS, rng);
      const nextSeed = (Math.floor(rng() * 0xffffffff) >>> 0) || 1;
      return { board, nextSeed };
    }
  }

  // Every attempt boxed in (extremely unlikely) — fall back to the fixed layout.
  const board = fallbackLayout(rng);
  const nextSeed = (Math.floor(rng() * 0xffffffff) >>> 0) || 1;
  return { board, nextSeed };
}

// ---- Fallback (deterministic, always valid) --------------------------------

// Hand-made contiguous clusters on the same 16×9 substrate, sizes matching the
// template. Column-major stripes guarantee contiguity and exact sizes.
function fallbackLayout(rng: () => number): BoardLayout {
  const owner = new Int32Array(TOTAL).fill(-1);
  const cellsByRegion: number[][] = Array.from({ length: ZONE_TEMPLATE.length }, () => []);
  const sizes = ZONE_TEMPLATE.map((z) => z.capacity);

  // Serpentine fill by row, slicing the sequence into contiguous size-runs.
  const order: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    if (r & 1) for (let c = COLS - 1; c >= 0; c--) order.push(idx(c, r));
    else for (let c = 0; c < COLS; c++) order.push(idx(c, r));
  }
  let pos = 0;
  for (let r = 0; r < sizes.length; r++) {
    for (let k = 0; k < sizes[r]; k++) {
      const cell = order[pos++];
      owner[cell] = r;
      cellsByRegion[r].push(cell);
    }
  }
  return buildLayout({ owner, cellsByRegion }, COLS, ROWS, rng);
}
