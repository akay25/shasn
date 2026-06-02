// Canvas country-map of the SHASN board. The board geometry is generated
// per-game (see src/engine/board/generate.ts) and lives on `state.board`: nine
// organic, contiguous regions carved from a horizontal rhombus of 144 hexes.
//
// Rendering: each region is filled as a single organic blob (no internal hex
// grid — only region boundaries are stroked), with voter holes/pegs at every
// cell centre. The map is clickable: a click resolves to the nearest cell and,
// via `onSlotClick`, drives voter placement. Region labels are an HTML overlay
// so text stays crisp and styled like the rest of the UI.

import { useEffect, useMemo, useRef } from "react";
import type { GameState, Player } from "@/engine/types";
import {
  totalVotersInZone,
  voterCountInZone,
  gerrymanderingRightsHolder,
} from "@/engine/selectors";

// ---- Hex geometry (pointy-top, odd-r offset) ------------------------------

const SIZE = 22;                         // hex circumradius (board units)
const HEX_W = Math.sqrt(3) * SIZE;       // horizontal pitch ≈ 38.1
const HEX_V = 1.5 * SIZE;                // vertical pitch  = 33
const MARGIN = 26;
const SS = 2;                            // supersample factor for crisp canvas

function cellPixel(col: number, row: number): { x: number; y: number } {
  return {
    x: MARGIN + HEX_W * (col + 0.5 + (row % 2 === 1 ? 0.5 : 0)),
    y: MARGIN + SIZE + HEX_V * row,
  };
}

// Inverse of cellPixel — pixel → nearest (col,row).
function pixelCell(x: number, y: number): { col: number; row: number } {
  const row = Math.round((y - MARGIN - SIZE) / HEX_V);
  const col = Math.round((x - MARGIN) / HEX_W - 0.5 - (row % 2 === 1 ? 0.5 : 0));
  return { col, row };
}

function hexVertices(cx: number, cy: number, size: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i;
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return pts;
}

const COLOR_HEX: Record<string, string> = {
  capitalist: "#f59e0b",
  supremo: "#ef4444",
  showstopper: "#a855f7",
  idealist: "#10b981",
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
  // zoneId -> empty slot indices to highlight as valid placement targets.
  selectableSlots?: Record<string, number[]>;
  onSlotClick?: (zoneId: string, slotIdx: number) => void;
}

export default function MapBoard({ state, selectableSlots, onSlotClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const board = state.board;

  // Viewport extent in board units, plus a cell→owner index for hit-testing
  // and boundary detection. Recomputed only when the geography changes.
  const layout = useMemo(() => {
    let maxX = 0;
    let maxY = 0;
    const owner = new Map<string, string>();          // "col,row" -> zoneId
    const slotOf = new Map<string, number>();         // "col,row" -> slot index
    for (const z of board.zones) {
      board.geometry[z.id].cells.forEach((cell, idx) => {
        const key = `${cell.col},${cell.row}`;
        owner.set(key, z.id);
        slotOf.set(key, idx);
        const { x, y } = cellPixel(cell.col, cell.row);
        maxX = Math.max(maxX, x + SIZE);
        maxY = Math.max(maxY, y + SIZE);
      });
    }
    return { vbW: Math.ceil(maxX + MARGIN), vbH: Math.ceil(maxY + MARGIN), owner, slotOf };
  }, [board]);

  // Draw whenever state or highlight changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { vbW, vbH, owner } = layout;
    canvas.width = vbW * SS;
    canvas.height = vbH * SS;
    ctx.setTransform(SS, 0, 0, SS, 0, 0);
    ctx.clearRect(0, 0, vbW, vbH);

    // Parchment backdrop.
    const grad = ctx.createLinearGradient(0, 0, vbW, vbH);
    grad.addColorStop(0, "#d8c39a");
    grad.addColorStop(1, "#bfa676");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vbW, vbH);

    const selectable = selectableSlots ?? {};

    // Pass 1 — fill every region as a solid blob (no internal hex lines). We
    // also stroke each hex with its own fill colour to hide anti-alias seams
    // between same-region cells.
    for (const z of board.zones) {
      const fill = board.geometry[z.id].color;
      ctx.fillStyle = fill;
      ctx.strokeStyle = fill;
      ctx.lineWidth = 1.5;
      for (const cell of board.geometry[z.id].cells) {
        const { x, y } = cellPixel(cell.col, cell.row);
        traceHex(ctx, x, y, SIZE);
        ctx.fill();
        ctx.stroke();
      }
    }

    // Pass 2 — region outlines: stroke only edges whose neighbour is a
    // different region (or off-board).
    ctx.strokeStyle = "#2c1d10";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (const z of board.zones) {
      for (const cell of board.geometry[z.id].cells) {
        const { x, y } = cellPixel(cell.col, cell.row);
        const verts = hexVertices(x, y, SIZE);
        for (let k = 0; k < 6; k++) {
          const a = verts[k];
          const b = verts[(k + 1) % 6];
          const mx = (a[0] + b[0]) / 2;
          const my = (a[1] + b[1]) / 2;
          // Neighbour centre across this edge = centre + 2*(mid - centre).
          const nb = pixelCell(x + 2 * (mx - x), y + 2 * (my - y));
          if (owner.get(`${nb.col},${nb.row}`) !== z.id) {
            ctx.beginPath();
            ctx.moveTo(a[0], a[1]);
            ctx.lineTo(b[0], b[1]);
            ctx.stroke();
          }
        }
      }
    }

    // Pass 3 — voter holes / pegs, volatile badges, highlights.
    for (const z of board.zones) {
      const zs = state.zones[z.id];
      const highlights = selectable[z.id];
      board.geometry[z.id].cells.forEach((cell, idx) => {
        const { x, y } = cellPixel(cell.col, cell.row);
        const isVolatile = z.volatileSlotIndices.includes(idx);
        const slot = zs.slots[idx];

        if (slot) {
          const owner = state.players.find((p) => p.id === slot.playerId);
          ctx.beginPath();
          ctx.arc(x, y, SIZE * 0.46, 0, Math.PI * 2);
          ctx.fillStyle = owner ? COLOR_HEX[owner.color] : "#777";
          ctx.fill();
          ctx.lineWidth = 1.4;
          ctx.strokeStyle = "#17110b";
          ctx.stroke();
          if (slot.isMajority) {
            ctx.fillStyle = "#fff";
            ctx.font = `900 ${SIZE * 0.7}px ui-serif, Georgia, serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("★", x, y + SIZE * 0.04);
          }
        } else {
          // Empty hole.
          ctx.beginPath();
          ctx.arc(x, y, SIZE * 0.34, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(40,28,16,0.30)";
          ctx.fill();
          // Highlight valid placement targets.
          if (highlights && highlights.includes(idx)) {
            ctx.beginPath();
            ctx.arc(x, y, SIZE * 0.5, 0, Math.PI * 2);
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = "#fde68a";
            ctx.stroke();
          }
        }

        // Volatile-area marker.
        if (isVolatile) {
          ctx.beginPath();
          ctx.arc(x, y - SIZE * 0.62, SIZE * 0.17, 0, Math.PI * 2);
          ctx.fillStyle = "#fde68a";
          ctx.fill();
          ctx.lineWidth = 0.8;
          ctx.strokeStyle = "#7c5a1a";
          ctx.stroke();
        }
      });
    }
  }, [state, layout, selectableSlots, board]);

  // Click → nearest cell → (zoneId, slotIdx).
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onSlotClick) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = layout.vbW / rect.width;
    const bx = (e.clientX - rect.left) * scale;
    const by = (e.clientY - rect.top) * scale;
    const { col, row } = pixelCell(bx, by);
    const key = `${col},${row}`;
    const zoneId = layout.owner.get(key);
    const slotIdx = layout.slotOf.get(key);
    if (zoneId === undefined || slotIdx === undefined) return;
    // Confirm the click landed inside the hex (not just the bounding cell).
    const { x, y } = cellPixel(col, row);
    if (Math.hypot(bx - x, by - y) > SIZE) return;
    onSlotClick(zoneId, slotIdx);
  };

  return (
    <div className="relative w-full" style={{ aspectRatio: `${layout.vbW}/${layout.vbH}` }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className={`absolute inset-0 w-full h-full block rounded-xl shadow-lg ${
          onSlotClick ? "cursor-pointer" : ""
        }`}
        role="img"
        aria-label="SHASN region map"
      />

      {/* HTML overlay: region labels + status chips. */}
      {board.zones.map((zone) => {
        const c = board.geometry[zone.id].centroid;
        const { x, y } = cellPixel(c.col, c.row);
        const left = (x / layout.vbW) * 100;
        const top = (y / layout.vbH) * 100;
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

function traceHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const v = hexVertices(cx, cy, size);
  ctx.beginPath();
  ctx.moveTo(v[0][0], v[0][1]);
  for (let i = 1; i < 6; i++) ctx.lineTo(v[i][0], v[i][1]);
  ctx.closePath();
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
