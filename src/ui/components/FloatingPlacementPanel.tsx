// The floating "Place your voters in the map" panel that replaces the old
// PlaceVoterModal popup. Renders the pending voter pegs as draggable discs
// (unplaced) or dashed placeholders (already drafted onto a map cell), with
// Reset + Save controls. Drag is driven by the parent via pointer events; this
// component is purely presentational.
import { forwardRef } from "react";
import { PLAYER_COLOR_HEX } from "./PlayerColorSwatch";
import type { PlayerColor } from "@/engine/types";

export interface PendingPeg {
  key: string;             // `${bundleIdx}:${voterIdx}`
  ownerColor: PlayerColor; // voter peg colour (player who'll own it)
  bundleIdx: number;       // which pending bundle the peg belongs to
}

interface Props {
  pegs: PendingPeg[];
  draftedPegKeys: Set<string>;
  draggingPegKey: string | null;
  onPegPointerDown: (pegKey: string, e: React.PointerEvent) => void;
  onSave: () => void;
  onReset: () => void;
}

const FloatingPlacementPanel = forwardRef<HTMLDivElement, Props>(function FloatingPlacementPanel(
  { pegs, draftedPegKeys, draggingPegKey, onPegPointerDown, onSave, onReset },
  ref,
) {
  const total = pegs.length;
  const remaining = total - draftedPegKeys.size;
  const canSave = total > 0 && remaining === 0;

  return (
    <div
      ref={ref}
      className="pointer-events-auto bg-neutral-900/95 backdrop-blur border border-amber-700/60 rounded-lg shadow-2xl p-3 w-[280px]"
      role="region"
      aria-label="Place your voters in the map"
      // Don't let pointer events here trigger the map's pan/zoom underneath.
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="text-[11px] uppercase tracking-widest text-amber-200 mb-1 font-bold">
        Place your voters in the map
      </div>
      <div className="text-[10px] text-neutral-400 mb-2">
        Drag each peg onto a highlighted cell.{" "}
        <span className="text-neutral-200 font-semibold">{remaining}</span> /{" "}
        {total} remaining.
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-2 min-h-[26px]">
        {pegs.map((peg) => {
          const placed = draftedPegKeys.has(peg.key);
          const isDragging = draggingPegKey === peg.key;
          if (placed) {
            return (
              <span
                key={peg.key}
                className="w-5 h-5 rounded-full border border-dashed border-neutral-600 inline-block"
                title="Placed on the map"
                aria-label="Placed on the map"
              />
            );
          }
          return (
            <span
              key={peg.key}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => onPegPointerDown(peg.key, e)}
              title="Drag onto the map"
              aria-label="Voter peg — drag onto the map"
              className={`w-5 h-5 rounded-full border border-black/40 inline-block cursor-grab active:cursor-grabbing shadow ring-1 ring-white/25 select-none ${
                isDragging ? "opacity-40" : ""
              }`}
              style={{ backgroundColor: PLAYER_COLOR_HEX[peg.ownerColor] }}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={draftedPegKeys.size === 0}
          className="text-[11px] px-2 py-1 rounded border border-neutral-700 text-neutral-200 hover:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          title={canSave ? "Commit your voter placements" : "Place every peg before saving"}
          className="text-[11px] px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
});

export default FloatingPlacementPanel;
