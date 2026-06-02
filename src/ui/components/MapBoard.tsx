// SVG map of the fictional SHASN country. Nine irregular regions in a
// landscape (3-wide × 3-tall) layout, each with terrain colour, label, and
// HTML voter-slot overlay positioned in SVG-space and projected onto the
// container via percentage coords so it scales with width.
//
// This component replaces the plain 3×3 box grid (Board.tsx) on the main
// game screen. Modals (gerrymander, placement) still use the simpler
// rectangular Board for clarity.

import type { GameState, Player } from "@/engine/types";
import { BOARD } from "@/data/board";
import VoterSlot from "./VoterSlot";
import {
  totalVotersInZone,
  voterCountInZone,
  gerrymanderingRightsHolder,
} from "@/engine/selectors";

const VB_W = 1200;
const VB_H = 540;

// 4×4 grid of shared vertices used to build the 9 zone polygons. Slight
// asymmetry on the inner verts gives an organic, map-like feel.
const V = {
  // top row
  A: [0, 0],     B: [395, 0],    C: [805, 0],    D: [1200, 0],
  // upper inner
  E: [0, 190],   F: [385, 180],  G: [820, 198],  H: [1200, 175],
  // lower inner
  I: [0, 360],   J: [410, 355],  K: [820, 372],  L: [1200, 350],
  // bottom row
  M: [0, 540],   N: [385, 540],  O: [815, 540],  P: [1200, 540],
} as const;

type Pt = readonly [number, number];

interface ZoneGeom {
  id: string;
  polygon: Pt[];        // closed polygon points
  terrain: string;      // tailwind/inline color
  // Inner rectangle used to layout the voter slots, in SVG coords.
  slotBox: { x: number; y: number; w: number; h: number };
  // Where to anchor the zone-name label.
  label: Pt;
}

const ZONES: ZoneGeom[] = [
  { id: "nw", polygon: [V.A, V.B, V.F, V.E],     terrain: "#4d5d4a", slotBox: { x: 30, y: 30, w: 320, h: 130 }, label: [190, 22] },
  { id: "n",  polygon: [V.B, V.C, V.G, V.F],     terrain: "#5a6e58", slotBox: { x: 415, y: 28, w: 380, h: 130 }, label: [600, 18] },
  { id: "ne", polygon: [V.C, V.D, V.H, V.G],     terrain: "#6c4a3e", slotBox: { x: 830, y: 25, w: 340, h: 135 }, label: [1000, 18] },
  { id: "w",  polygon: [V.E, V.F, V.J, V.I],     terrain: "#8c7250", slotBox: { x: 25, y: 205, w: 340, h: 130 }, label: [190, 200] },
  { id: "c",  polygon: [V.F, V.G, V.K, V.J],     terrain: "#9a813a", slotBox: { x: 405, y: 200, w: 400, h: 150 }, label: [600, 200] },
  { id: "e",  polygon: [V.G, V.H, V.L, V.K],     terrain: "#3c5b6e", slotBox: { x: 835, y: 200, w: 340, h: 150 }, label: [1000, 200] },
  { id: "sw", polygon: [V.I, V.J, V.N, V.M],     terrain: "#7d7740", slotBox: { x: 25, y: 380, w: 340, h: 135 }, label: [190, 372] },
  { id: "s",  polygon: [V.J, V.K, V.O, V.N],     terrain: "#5d7a48", slotBox: { x: 415, y: 388, w: 380, h: 130 }, label: [600, 380] },
  { id: "se", polygon: [V.K, V.L, V.P, V.O],     terrain: "#3e6b6b", slotBox: { x: 835, y: 380, w: 340, h: 130 }, label: [1000, 380] },
];

function polyPath(points: Pt[]): string {
  return points.map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1]).join(" ") + " Z";
}

// Lay out N slots in a centred grid inside the given box. Returns slot
// centre coordinates in SVG units.
function layoutSlots(n: number, box: { x: number; y: number; w: number; h: number }): Pt[] {
  // Pick columns to roughly match box aspect.
  const aspect = box.w / box.h;
  const cols = Math.max(1, Math.round(Math.sqrt(n * aspect)));
  const rows = Math.ceil(n / cols);
  const cellW = box.w / cols;
  const cellH = box.h / rows;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    // Centre the last (potentially short) row by offsetting it.
    const itemsInRow = r === rows - 1 ? n - r * cols : cols;
    const rowOffset = ((cols - itemsInRow) * cellW) / 2;
    pts.push([
      box.x + rowOffset + cellW * (c + 0.5),
      box.y + cellH * (r + 0.5),
    ]);
  }
  return pts;
}

interface Props {
  state: GameState;
}

export default function MapBoard({ state }: Props) {
  // Pre-compute slot positions for each zone.
  const slotPositions: Record<string, Pt[]> = {};
  for (const g of ZONES) {
    const data = BOARD.zones.find((z) => z.id === g.id)!;
    slotPositions[g.id] = layoutSlots(data.capacity, g.slotBox);
  }

  return (
    <div className="relative w-full" style={{ aspectRatio: `${VB_W}/${VB_H}` }}>
      {/* Map background (SVG) — terrain regions, borders, labels. */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full block rounded-xl"
        role="img"
        aria-label="SHASN territorial map"
      >
        {/* Sea/parchment backdrop */}
        <defs>
          <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1c2733" />
            <stop offset="1" stopColor="#0d1620" />
          </linearGradient>
          <pattern id="grain" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="transparent" />
            <circle cx="1" cy="1" r="0.5" fill="rgba(255,255,255,0.04)" />
            <circle cx="4" cy="3" r="0.4" fill="rgba(0,0,0,0.06)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#seaGrad)" />

        {/* Land regions */}
        {ZONES.map((g) => (
          <g key={g.id}>
            <path
              d={polyPath(g.polygon)}
              fill={g.terrain}
              stroke="#0a0f15"
              strokeWidth={3}
              strokeLinejoin="round"
            />
            {/* Subtle texture overlay on land */}
            <path d={polyPath(g.polygon)} fill="url(#grain)" />
          </g>
        ))}

        {/* Zone name labels */}
        {ZONES.map((g) => {
          const data = BOARD.zones.find((z) => z.id === g.id)!;
          return (
            <g key={`label-${g.id}`}>
              <text
                x={g.label[0]}
                y={g.label[1]}
                textAnchor="middle"
                fontFamily="ui-serif, Georgia, serif"
                fontSize={16}
                fontWeight={700}
                fill="#f5e9c8"
                style={{ letterSpacing: "0.08em" }}
              >
                {data.name.toUpperCase()}
              </text>
            </g>
          );
        })}

        {/* Map decoration: compass */}
        <g transform="translate(60,490)" opacity="0.5">
          <circle r="22" fill="none" stroke="#f5e9c8" strokeWidth="1" />
          <text textAnchor="middle" y="-26" fontSize="9" fill="#f5e9c8" fontFamily="ui-serif, Georgia, serif">N</text>
          <text textAnchor="middle" y="32" fontSize="9" fill="#f5e9c8" fontFamily="ui-serif, Georgia, serif">S</text>
          <text x="28" dy="3" fontSize="9" fill="#f5e9c8" fontFamily="ui-serif, Georgia, serif">E</text>
          <text x="-32" dy="3" fontSize="9" fill="#f5e9c8" fontFamily="ui-serif, Georgia, serif">W</text>
          <polygon points="0,-15 4,0 0,15 -4,0" fill="#f5e9c8" />
        </g>
      </svg>

      {/* Voter slot + info overlay (HTML, positioned in % of container). */}
      {ZONES.map((g) => {
        const data = BOARD.zones.find((z) => z.id === g.id)!;
        const zs = state.zones[g.id];
        const positions = slotPositions[g.id];
        const total = totalVotersInZone(zs);
        const holder = zs.majorityHolder
          ? state.players.find((p) => p.id === zs.majorityHolder)
          : null;
        const gerryHolderId = gerrymanderingRightsHolder(state, g.id);
        const gerryHolder = gerryHolderId
          ? state.players.find((p) => p.id === gerryHolderId)
          : null;

        // Place the info chip near the top of the zone (just above the label).
        const chipX = (g.label[0] / VB_W) * 100;
        const chipY = ((g.label[1] + 6) / VB_H) * 100;

        return (
          <div key={`overlay-${g.id}`}>
            {/* Voter slots */}
            {zs.slots.map((slot, idx) => {
              const [sx, sy] = positions[idx];
              const left = (sx / VB_W) * 100;
              const top = (sy / VB_H) * 100;
              const volatile = data.volatileSlotIndices.includes(idx);
              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  <VoterSlot
                    slot={slot}
                    volatile={volatile}
                    players={state.players}
                  />
                </div>
              );
            })}
            {/* Info chip — capacity / majority / holder */}
            <div
              className="absolute -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide bg-black/55 text-amber-50 border border-amber-50/15 whitespace-nowrap pointer-events-none"
              style={{ left: `${chipX}%`, top: `${chipY}%` }}
            >
              <span className="opacity-75">{total}/{data.capacity}</span>
              <span className="opacity-50"> · </span>
              <span className="opacity-75">maj {data.majorityRequirement}</span>
              {holder ? <HolderBadge p={holder} /> : null}
              {!holder && gerryHolder ? <GerryBadge p={gerryHolder} count={voterCountInZone(zs, gerryHolder.id)} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const COLOR_TEXT: Record<string, string> = {
  capitalist: "text-capitalist",
  supremo: "text-supremo",
  showstopper: "text-showstopper",
  idealist: "text-idealist",
};

function HolderBadge({ p }: { p: Player }) {
  return (
    <span className="ml-1">
      <span className="opacity-60">· MAJ </span>
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
