// 3x3 board grid of Zone tiles.
import type { GameState } from "@/engine/types";
import Zone from "./Zone";

interface Props {
  state: GameState;
  selectableSlotsByZone?: Record<string, { slotIdx: number; selected?: boolean }[]>;
  onSlotClick?: (zoneId: string, slotIdx: number) => void;
}

// Render in the documented order, which is row-major NW -> SE.
const ZONE_ORDER = ["nw", "n", "ne", "w", "c", "e", "sw", "s", "se"];

export default function Board({ state, selectableSlotsByZone, onSlotClick }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {ZONE_ORDER.map((id) => {
        const zone = state.board.zones.find((z) => z.id === id)!;
        const zs = state.zones[id];
        const selSlots = selectableSlotsByZone?.[id];
        return (
          <Zone
            key={id}
            zone={zone}
            zoneState={zs}
            players={state.players}
            gameState={state}
            selectableSlots={selSlots}
            onSlotClick={onSlotClick ? (idx) => onSlotClick(id, idx) : undefined}
          />
        );
      })}
    </div>
  );
}
