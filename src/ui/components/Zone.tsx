// A single zone tile on the 3x3 board.
import type { Player, Zone as ZoneT, ZoneState } from "@/engine/types";
import VoterSlot from "./VoterSlot";
import {
  totalVotersInZone,
  voterCountInZone,
  gerrymanderingRightsHolder,
} from "@/engine/selectors";
import type { GameState } from "@/engine/types";

interface Props {
  zone: ZoneT;
  zoneState: ZoneState;
  players: Player[];
  gameState: GameState;
  selectableSlots?: { slotIdx: number; selected?: boolean }[];
  onSlotClick?: (slotIdx: number) => void;
}

const COLOR_TEXT: Record<string, string> = {
  capitalist: "text-capitalist",
  supremo: "text-supremo",
  showstopper: "text-showstopper",
  idealist: "text-idealist",
};

export default function Zone({
  zone,
  zoneState,
  players,
  gameState,
  selectableSlots,
  onSlotClick,
}: Props) {
  const total = totalVotersInZone(zoneState);
  const holder = zoneState.majorityHolder
    ? players.find((p) => p.id === zoneState.majorityHolder)
    : null;
  const gerryHolderId = gerrymanderingRightsHolder(gameState, zone.id);
  const gerryHolder = gerryHolderId
    ? players.find((p) => p.id === gerryHolderId)
    : null;

  const selectableMap = new Map<number, boolean>();
  if (selectableSlots) {
    for (const s of selectableSlots) selectableMap.set(s.slotIdx, !!s.selected);
  }

  return (
    <div className="flex flex-col gap-1 p-2 bg-neutral-900 border border-neutral-700 rounded-lg">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold text-neutral-200">{zone.name}</div>
        <div className="text-[10px] text-neutral-400">
          {total}/{zone.capacity} · maj {zone.majorityRequirement}
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1 my-1">
        {zoneState.slots.map((slot, idx) => {
          const isVolatile = zone.volatileSlotIndices.includes(idx);
          const selectable = selectableMap.has(idx);
          return (
            <VoterSlot
              key={idx}
              slot={slot}
              volatile={isVolatile}
              players={players}
              selectable={selectable}
              selected={selectableMap.get(idx)}
              onClick={selectable && onSlotClick ? () => onSlotClick(idx) : undefined}
            />
          );
        })}
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <div className="text-neutral-400">
          {holder ? (
            <span>
              Majority:{" "}
              <span className={`font-bold ${COLOR_TEXT[holder.color]}`}>
                {holder.name}
              </span>
            </span>
          ) : (
            <span className="text-neutral-500">No majority</span>
          )}
        </div>
        <div className="text-neutral-500">
          {gerryHolder ? (
            <span>
              Gerry:{" "}
              <span className={COLOR_TEXT[gerryHolder.color]}>{gerryHolder.name}</span>{" "}
              ({voterCountInZone(zoneState, gerryHolder.id)})
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
