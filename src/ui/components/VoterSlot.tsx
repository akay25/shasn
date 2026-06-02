// One voter slot in a zone. Empty, occupied (non-majority), or majority.
// Volatile slots are highlighted with a thick warning ring.
import type { Player, Slot } from "@/engine/types";
import { PLAYER_COLOR_BG } from "./PlayerColorSwatch";

interface Props {
  slot: Slot;
  volatile: boolean;
  players: Player[];
  onClick?: () => void;
  selectable?: boolean;
  selected?: boolean;
}

export default function VoterSlot({
  slot,
  volatile,
  players,
  onClick,
  selectable,
  selected,
}: Props) {
  const owner = slot ? players.find((p) => p.id === slot.playerId) : null;
  const colorBg = owner ? PLAYER_COLOR_BG[owner.color] ?? "bg-neutral-500" : "";

  const base =
    "w-5 h-5 rounded-full border flex items-center justify-center text-[8px] font-bold transition";
  const ring = volatile ? "ring-2 ring-amber-300 ring-offset-1 ring-offset-neutral-900" : "";
  const interact = selectable
    ? "cursor-pointer hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
    : "";
  const sel = selected ? "scale-110 ring-2 ring-white" : "";

  if (!slot) {
    return (
      <button
        type="button"
        disabled={!selectable}
        onClick={onClick}
        className={`${base} ${ring} ${interact} ${sel} bg-neutral-800 border-neutral-700`}
        title={volatile ? "Volatile slot (empty)" : "Empty slot"}
        aria-label={volatile ? "Empty volatile slot" : "Empty slot"}
      />
    );
  }
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      className={`${base} ${ring} ${interact} ${sel} ${colorBg} ${
        slot.isMajority ? "border-white text-white" : "border-black/40 text-transparent"
      }`}
      title={`${owner?.name ?? "?"}${slot.isMajority ? " (majority)" : ""}${
        volatile ? " · Volatile" : ""
      }`}
      aria-label={`${owner?.name ?? "?"} voter${slot.isMajority ? ", majority" : ""}`}
    >
      {slot.isMajority ? "M" : ""}
    </button>
  );
}
