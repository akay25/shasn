// Placement modal for one pending voter. Voters from a single voter card MUST
// go into one zone (engine validates), so we let the player pick a zone first,
// then the empty slot inside it. For non-card sources, any zone is allowed.
import { useState } from "react";
import Modal from "./Modal";
import type { GameState } from "@/engine/types";
import { BOARD } from "@/data/board";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer, emptySlotsInZone } from "@/engine/selectors";
import Board from "./Board";

interface Props {
  state: GameState;
  onClose: () => void;
}

export default function PlaceVoterModal({ state, onClose }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const [pendingIdx, setPendingIdx] = useState(0);

  const safePendingIdx = Math.min(pendingIdx, state.pendingPlacements.length - 1);
  const group = state.pendingPlacements[safePendingIdx];
  if (!group) {
    return (
      <Modal title="Place voter" onClose={onClose}>
        <div className="text-sm text-neutral-300">No pending placements.</div>
      </Modal>
    );
  }

  const handleSlotClick = (zoneId: string, slotIdx: number) => {
    dispatch({
      t: "placeVoter",
      zoneId,
      slotIdx,
      pendingIdx: safePendingIdx,
    });
  };

  // Build selectable map: every empty slot in any zone (engine enforces card-source single-zone rule).
  const selectableSlotsByZone: Record<
    string,
    { slotIdx: number; selected?: boolean }[]
  > = {};
  for (const z of BOARD.zones) {
    const zs = state.zones[z.id];
    const arr: { slotIdx: number }[] = [];
    zs.slots.forEach((s, i) => {
      if (s === null) arr.push({ slotIdx: i });
    });
    if (arr.length > 0) selectableSlotsByZone[z.id] = arr;
  }

  const remaining = group.voters.length;
  const total = state.pendingPlacements.reduce((n, g) => n + g.voters.length, 0);

  return (
    <Modal
      title={`Place voters — ${active.name}`}
      onClose={onClose}
      closable
      wide
    >
      <div className="space-y-3">
        <div className="text-sm">
          <span className="font-semibold">{remaining}</span> remaining in this group
          (source: <span className="text-neutral-300">{group.source}</span>
          {group.voterCardId ? ` — must go into one zone` : ""}).{" "}
          <span className="text-neutral-400">Total pending: {total}</span>
        </div>
        {state.pendingPlacements.length > 1 ? (
          <div className="flex gap-2">
            {state.pendingPlacements.map((g, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPendingIdx(i)}
                className={`text-xs px-2 py-1 rounded border ${
                  i === safePendingIdx
                    ? "border-white bg-neutral-800"
                    : "border-neutral-700 hover:bg-neutral-800"
                }`}
              >
                Group {i + 1} ({g.voters.length}, {g.source})
              </button>
            ))}
          </div>
        ) : null}
        <Board
          state={state}
          selectableSlotsByZone={selectableSlotsByZone}
          onSlotClick={handleSlotClick}
        />
        <div className="text-xs text-neutral-400">
          Click an empty slot (gray) to place the next voter from this group.
          Volatile slots glow amber and trigger a Headline.
        </div>
        <div className="text-xs text-neutral-400">
          Empty slots per zone:{" "}
          {BOARD.zones
            .map((z) => `${z.id}=${emptySlotsInZone(state.zones[z.id])}`)
            .join(" · ")}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800"
          >
            Done for now
          </button>
        </div>
      </div>
    </Modal>
  );
}
