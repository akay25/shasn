// Hex-tile map of the SHASN country. Each zone is a connected cluster of
// pointy-top hexagons; the cluster cells are listed below in offset
// coordinates (col, row, odd-r horizontal layout). The number of hexes per
// zone matches `BOARD.zones[i].capacity` so every voter slot in state has
// exactly one hex on screen.
//
// Layout overview (offset coords, odd rows shifted right by HEX_W/2):
//   rows 0–2 : nw (cols 0–3), n  (cols 4–9), ne (cols 11–14)
//   row  3   : w  bridge,    n  tail,        e  top
//   rows 4–7 : w  (cols 0–4), c  (cols 4–7), e  (cols 8–13)
//   rows 8–10: sw (cols 0–3), s  (cols 4–10), se (cols 11–14)
//
// Tile counts match the published board: 11 / 21 / 11 corner+edge layout,
// 16 in the centre, totalling 144 hexes with 11 Volatile Areas.

import type { GameState, Player } from "@/engine/types";
import { BOARD } from "@/data/board";
import { COIN_SRC } from "./Coin";
import {
  totalVotersInZone,
  voterCountInZone,
  gerrymanderingRightsHolder,
} from "@/engine/selectors";

// ---- Hex geometry ----------------------------------------------------------

const SIZE = 20;                         // hex circumradius
const HEX_W = Math.sqrt(3) * SIZE;       // horizontal pitch ≈ 34.64
const HEX_V = 1.5 * SIZE;                // vertical pitch  = 30
const MARGIN_X = 16;
const MARGIN_Y = 18;

function cellToPixel(col: number, row: number): { x: number; y: number } {
  // odd-r horizontal layout: odd rows shifted right by HEX_W/2
  return {
    x: MARGIN_X + HEX_W * (col + 0.5 + (row % 2 === 1 ? 0.5 : 0)),
    y: MARGIN_Y + SIZE + HEX_V * row,
  };
}

function hexPath(cx: number, cy: number, size: number = SIZE): string {
  // Pointy-top hexagon — top vertex straight up.
  let s = "";
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i;
    const x = cx + size * Math.cos(a);
    const y = cy + size * Math.sin(a);
    s += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
  }
  return s + "Z";
}

// ---- Zone hex layouts -----------------------------------------------------
// Each zone is a list of (col, row) cells. Order matches the zone's slot
// index in `state.zones[id].slots`, so volatileSlotIndices align with the
// rendered hexes.

type Cell = readonly [number, number];

const ZONE_CELLS: Record<string, Cell[]> = {
  nw: [
    [0, 0], [1, 0], [2, 0],
    [0, 1], [1, 1], [2, 1], [3, 1],
    [0, 2], [1, 2], [2, 2], [3, 2],
  ],
  n: [
    [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
    [4, 1], [5, 1], [6, 1], [7, 1], [8, 1],
    [4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 2],
    [5, 3], [6, 3], [7, 3], [8, 3],
  ],
  ne: [
    [11, 0], [12, 0], [13, 0],
    [11, 1], [12, 1], [13, 1], [14, 1],
    [11, 2], [12, 2], [13, 2], [14, 2],
  ],
  w: [
    [0, 3], [1, 3], [2, 3], [3, 3],
    [0, 4], [1, 4], [2, 4], [3, 4],
    [0, 5], [1, 5], [2, 5], [3, 5],
    [0, 6], [1, 6], [2, 6], [3, 6],
    [0, 7], [1, 7], [2, 7], [3, 7], [4, 7],
  ],
  c: [
    [4, 4], [5, 4], [6, 4], [7, 4],
    [4, 5], [5, 5], [6, 5], [7, 5],
    [4, 6], [5, 6], [6, 6], [7, 6],
    [5, 7], [6, 7], [7, 7], [8, 7],
  ],
  e: [
    [9, 3], [10, 3], [11, 3], [12, 3], [13, 3], [14, 3],
    [8, 4], [9, 4], [10, 4], [11, 4], [12, 4], [13, 4],
    [8, 5], [9, 5], [10, 5], [11, 5], [12, 5],
    [8, 6], [9, 6], [10, 6], [11, 6],
  ],
  sw: [
    [0, 8], [1, 8], [2, 8], [3, 8],
    [0, 9], [1, 9], [2, 9], [3, 9],
    [0, 10], [1, 10], [2, 10],
  ],
  s: [
    [4, 8], [5, 8], [6, 8], [7, 8], [8, 8], [9, 8],
    [4, 9], [5, 9], [6, 9], [7, 9], [8, 9], [9, 9], [10, 9],
    [3, 10], [4, 10], [5, 10], [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
  ],
  se: [
    [11, 8], [12, 8], [13, 8], [14, 8],
    [11, 9], [12, 9], [13, 9], [14, 9],
    [11, 10], [12, 10], [13, 10],
  ],
};

// Pastel terrain colour per zone, matching the photographed board.
const ZONE_FILL: Record<string, string> = {
  nw: "#b6d6cf",  // mint
  n:  "#e4c4d2",  // pink
  ne: "#e8c8d4",  // blush
  w:  "#e6d2b4",  // wheat
  c:  "#f5ecd9",  // light cream
  e:  "#c2d4e2",  // light blue
  sw: "#e8c8c0",  // dusty rose
  s:  "#e6d2b4",  // wheat
  se: "#bcd0dc",  // pale slate-blue
};

// Friendly label position (col, row) — picks an interior hex per zone so the
// name overlays cleanly on the cluster.
const LABEL_CELL: Record<string, Cell> = {
  nw: [1, 1],
  n:  [6, 1],
  ne: [12, 1],
  w:  [1, 5],
  c:  [5, 5],
  e:  [11, 4],
  sw: [1, 9],
  s:  [6, 9],
  se: [12, 9],
};

const COLOR_TEXT: Record<string, string> = {
  capitalist: "text-capitalist",
  supremo: "text-supremo",
  showstopper: "text-showstopper",
  idealist: "text-idealist",
};

// ---- Component -------------------------------------------------------------

interface Props {
  state: GameState;
}

// Computed viewBox derived from the most extreme cell positions plus margin.
const ALL_CELLS: Cell[] = Object.values(ZONE_CELLS).flat();
const VB_W = (() => {
  let max = 0;
  for (const [c, r] of ALL_CELLS) {
    const x = cellToPixel(c, r).x + SIZE;
    if (x > max) max = x;
  }
  return Math.ceil(max + MARGIN_X);
})();
const VB_H = (() => {
  let max = 0;
  for (const [c, r] of ALL_CELLS) {
    const y = cellToPixel(c, r).y + SIZE;
    if (y > max) max = y;
  }
  return Math.ceil(max + MARGIN_Y);
})();

export default function MapBoard({ state }: Props) {
  return (
    <div className="relative w-full" style={{ aspectRatio: `${VB_W}/${VB_H}` }}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 w-full h-full block rounded-xl shadow-lg"
        role="img"
        aria-label="SHASN hex-tile map"
      >
        <defs>
          <linearGradient id="parchment" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d2bc92" />
            <stop offset="1" stopColor="#c0a778" />
          </linearGradient>
          <pattern id="grit" patternUnits="userSpaceOnUse" width="5" height="5">
            <circle cx="1" cy="1" r="0.4" fill="rgba(0,0,0,0.06)" />
            <circle cx="3.5" cy="3" r="0.3" fill="rgba(255,255,255,0.05)" />
          </pattern>
        </defs>

        {/* Parchment backdrop */}
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#parchment)" />
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#grit)" />

        {/* All hex tiles */}
        {BOARD.zones.map((zone) => {
          const cells = ZONE_CELLS[zone.id] || [];
          const fill = ZONE_FILL[zone.id];
          return (
            <g key={zone.id} aria-label={zone.name}>
              {cells.map(([col, row], idx) => {
                const { x, y } = cellToPixel(col, row);
                const isVolatile = zone.volatileSlotIndices.includes(idx);
                const slot = state.zones[zone.id].slots[idx];
                const owner = slot
                  ? state.players.find((p) => p.id === slot.playerId)
                  : null;
                return (
                  <g key={`${col}-${row}`}>
                    {/* Hex tile background */}
                    <path
                      d={hexPath(x, y)}
                      fill={fill}
                      stroke="#3a2818"
                      strokeWidth={1.2}
                      strokeLinejoin="round"
                    />
                    {/* Volatile marker (small ring with star) */}
                    {isVolatile ? (
                      <g pointerEvents="none">
                        <circle
                          cx={x}
                          cy={y - SIZE * 0.45}
                          r={SIZE * 0.18}
                          fill="#fde68a"
                          stroke="#7c5a1a"
                          strokeWidth={0.8}
                        />
                        <text
                          x={x}
                          y={y - SIZE * 0.4}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={SIZE * 0.24}
                          fill="#7c5a1a"
                          fontWeight={700}
                        >
                          ★
                        </text>
                      </g>
                    ) : null}
                    {/* Voter peg — the coin image of the owner's ideologue. */}
                    {owner ? (
                      <g pointerEvents="none">
                        <image
                          href={COIN_SRC[owner.color]}
                          x={x - SIZE * 0.5}
                          y={y - SIZE * 0.5 + (isVolatile ? SIZE * 0.05 : 0)}
                          width={SIZE}
                          height={SIZE}
                          preserveAspectRatio="xMidYMid slice"
                          style={{ clipPath: "circle(50% at 50% 50%)" }}
                        />
                        <circle
                          cx={x}
                          cy={y + (isVolatile ? SIZE * 0.05 : 0)}
                          r={SIZE * 0.5}
                          fill="none"
                          stroke="#1a1410"
                          strokeWidth={1.4}
                        />
                        {slot?.isMajority ? (
                          <g>
                            <circle
                              cx={x}
                              cy={y + (isVolatile ? SIZE * 0.05 : 0)}
                              r={SIZE * 0.5}
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth={1.8}
                            />
                            <text
                              x={x}
                              y={y + (isVolatile ? SIZE * 0.05 : 0)}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={SIZE * 0.5}
                              fill="#fff"
                              stroke="#000"
                              strokeWidth={0.4}
                              fontWeight={900}
                              style={{ paintOrder: "stroke" }}
                            >
                              ★
                            </text>
                          </g>
                        ) : null}
                      </g>
                    ) : null}
                  </g>
                );
              })}

              {/* Zone label — band across the centre of the cluster */}
              <ZoneLabel zoneId={zone.id} />
            </g>
          );
        })}

        {/* Compass */}
        <g transform={`translate(${VB_W - 50},${VB_H - 50})`} opacity="0.55">
          <circle r="18" fill="none" stroke="#3a2818" strokeWidth="1" />
          <text textAnchor="middle" y="-22" fontSize="9" fill="#3a2818" fontFamily="ui-serif, Georgia, serif">N</text>
          <text textAnchor="middle" y="26" fontSize="9" fill="#3a2818" fontFamily="ui-serif, Georgia, serif">S</text>
          <text x="22" dy="3" fontSize="9" fill="#3a2818" fontFamily="ui-serif, Georgia, serif">E</text>
          <text x="-26" dy="3" fontSize="9" fill="#3a2818" fontFamily="ui-serif, Georgia, serif">W</text>
          <polygon points="0,-12 3,0 0,12 -3,0" fill="#3a2818" />
        </g>
      </svg>

      {/* HTML overlay for zone info chips (capacity / majority / holder). */}
      {BOARD.zones.map((zone) => {
        const [col, row] = LABEL_CELL[zone.id];
        const { x, y } = cellToPixel(col, row);
        const left = (x / VB_W) * 100;
        const top = (y / VB_H) * 100;
        const zs = state.zones[zone.id];
        const total = totalVotersInZone(zs);
        const holder = zs.majorityHolder
          ? state.players.find((p) => p.id === zs.majorityHolder)
          : null;
        const gerryHolderId = gerrymanderingRightsHolder(state, zone.id);
        const gerryHolder = gerryHolderId
          ? state.players.find((p) => p.id === gerryHolderId)
          : null;
        return (
          <div
            key={`chip-${zone.id}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-0.5"
            style={{ left: `${left}%`, top: `${top}%` }}
          >
            <div
              className="px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-black/65 text-amber-50 border border-amber-100/25 whitespace-nowrap"
              style={{ fontFamily: "ui-serif, Georgia, serif" }}
            >
              {zone.name}
            </div>
            <div className="px-1.5 py-0 rounded bg-black/55 text-amber-50 border border-amber-100/15 text-[10px] whitespace-nowrap">
              <span className="opacity-80">{zone.majorityRequirement}/{zone.capacity}</span>
              {holder ? <HolderBadge p={holder} /> : null}
              {!holder && gerryHolder ? (
                <GerryBadge p={gerryHolder} count={voterCountInZone(zs, gerryHolder.id)} />
              ) : null}
              {!holder && !gerryHolder ? (
                <span className="opacity-50"> · {total}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ZoneLabel(_: { zoneId: string }) {
  // Label rendering moved to the HTML overlay so positioning / colours can
  // match the rest of the UI. This SVG component is intentionally empty.
  return null;
}

function HolderBadge({ p }: { p: Player }) {
  return (
    <span className="ml-1">
      <span className="opacity-60">· maj </span>
      <span className={`font-bold ${COLOR_TEXT[p.color]}`}>{p.name}</span>
    </span>
  );
}

function GerryBadge({ p, count }: { p: Player; count: number }) {
  return (
    <span className="ml-1">
      <span className="opacity-60">· gerry </span>
      <span className={COLOR_TEXT[p.color]}>{p.name}</span>
      <span className="opacity-60"> ({count})</span>
    </span>
  );
}
