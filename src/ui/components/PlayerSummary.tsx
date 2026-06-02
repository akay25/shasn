// Compact summary for non-active players. Public info only: resources,
// ideology card count, conspiracy hand count.
import type { Player } from "@/engine/types";
import ResourceTrack from "./ResourceTrack";
import PlayerColorSwatch from "./PlayerColorSwatch";

interface Props {
  player: Player;
  isActive?: boolean;
  isNext?: boolean;
}

export default function PlayerSummary({ player, isActive, isNext }: Props) {
  return (
    <div
      className={`bg-neutral-900/60 rounded-lg p-2 border ${
        isActive
          ? "border-white"
          : isNext
          ? "border-blue-400/60"
          : "border-neutral-700"
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <PlayerColorSwatch color={player.color} size="sm" />
        <div className="font-semibold text-sm truncate flex-1">{player.name}</div>
        {isActive ? (
          <div className="text-[10px] uppercase text-white/80">Active</div>
        ) : null}
      </div>
      <ResourceTrack resources={player.resources} compact />
      <div className="grid grid-cols-2 gap-1 text-[10px] text-neutral-400 mt-1">
        <div>Ideo: {player.ideologyCards.length}</div>
        <div>Consp: {player.conspiracyHand.length}</div>
      </div>
    </div>
  );
}
