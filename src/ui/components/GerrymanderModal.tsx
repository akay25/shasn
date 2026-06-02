// Gerrymander: move 1 non-majority voter from a zone to an adjacent zone,
// only if active player has gerrymandering rights in the source zone. The
// engine performs the full validation; this UI provides the picker.
import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { GameState } from "@/engine/types";
import { BOARD, getZone } from "@/data/board";
import { useDispatch } from "@/ui/hooks/useDispatch";
import {
  activePlayer,
  gerrymanderingRightsHolder,
  emptySlotsInZone,
  isVolatileSlot,
} from "@/engine/selectors";
import Board from "./Board";

interface Props {
  state: GameState;
  onClose: () => void;
}

export default function GerrymanderModal({ state, onClose }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);

  // Zones where active player has gerrymandering rights.
  const rightsZones = useMemo(
    () =>
      BOARD.zones.filter((z) => gerrymanderingRightsHolder(state, z.id) === active.id),
    [state, active.id],
  );

  const [step, setStep] = useState<"pickFrom" | "pickTo">("pickFrom");
  const [fromZone, setFromZone] = useState<string | null>(null);
  const [fromSlotIdx, setFromSlotIdx] = useState<number | null>(null);

  // Pick a non-majority, non-volatile voter from a rights-zone or one adjacent to it.
  const selectableFrom: Record<string, { slotIdx: number; selected?: boolean }[]> = {};
  for (const z of rightsZones) {
    // From the rights zone itself.
    const zs = state.zones[z.id];
    const arr: { slotIdx: number; selected?: boolean }[] = [];
    zs.slots.forEach((s, i) => {
      if (!s) return;
      if (s.isMajority) return;
      if (isVolatileSlot(z.id, i)) return;
      arr.push({
        slotIdx: i,
        selected: fromZone === z.id && fromSlotIdx === i,
      });
    });
    if (arr.length > 0) selectableFrom[z.id] = arr;
    // Adjacent zones — also draggable INTO the rights zone (and back); but
    // rulebook says "move one non-majority voter in or out of that zone, or
    // between two adjacent zones" — we let the engine validate the legality.
    for (const adj of z.adjacent) {
      const azs = state.zones[adj];
      if (selectableFrom[adj]) continue;
      const aarr: { slotIdx: number; selected?: boolean }[] = [];
      azs.slots.forEach((s, i) => {
        if (!s) return;
        if (s.isMajority) return;
        if (isVolatileSlot(adj, i)) return;
        aarr.push({
          slotIdx: i,
          selected: fromZone === adj && fromSlotIdx === i,
        });
      });
      if (aarr.length > 0) selectableFrom[adj] = aarr;
    }
  }

  // Target: any empty, non-volatile slot in a zone adjacent to fromZone (and the fromZone itself excluded).
  const selectableTo: Record<string, { slotIdx: number; selected?: boolean }[]> = {};
  if (step === "pickTo" && fromZone) {
    const from = getZone(fromZone);
    const candidateZoneIds = [fromZone, ...from.adjacent];
    for (const zid of candidateZoneIds) {
      const zs = state.zones[zid];
      const arr: { slotIdx: number; selected?: boolean }[] = [];
      zs.slots.forEach((s, i) => {
        if (s) return;
        if (isVolatileSlot(zid, i)) return;
        if (zid === fromZone && i === fromSlotIdx) return;
        arr.push({ slotIdx: i });
      });
      if (arr.length > 0) selectableTo[zid] = arr;
    }
  }

  const onSlotClick = (zoneId: string, slotIdx: number) => {
    if (step === "pickFrom") {
      setFromZone(zoneId);
      setFromSlotIdx(slotIdx);
      setStep("pickTo");
    } else if (step === "pickTo" && fromZone !== null && fromSlotIdx !== null) {
      dispatch({
        t: "gerrymander",
        fromZone,
        fromSlotIdx,
        toZone: zoneId,
        toSlotIdx: slotIdx,
      });
      onClose();
    }
  };

  return (
    <Modal title="Gerrymander" onClose={onClose} wide>
      <div className="space-y-3">
        {rightsZones.length === 0 ? (
          <div className="text-sm text-neutral-300">
            You don't have gerrymandering rights in any zone right now.
          </div>
        ) : null}
        <div className="text-sm">
          {step === "pickFrom"
            ? "Step 1 — pick a non-majority voter (in a rights zone or adjacent)."
            : `Step 2 — pick an empty target slot in ${fromZone} or one of its adjacent zones.`}
        </div>
        <Board
          state={state}
          selectableSlotsByZone={step === "pickFrom" ? selectableFrom : selectableTo}
          onSlotClick={onSlotClick}
        />
        <div className="flex justify-between items-center">
          <div className="text-xs text-neutral-400">
            Empty slots:{" "}
            {BOARD.zones
              .map((z) => `${z.id}=${emptySlotsInZone(state.zones[z.id])}`)
              .join(" · ")}
          </div>
          <div className="flex gap-2">
            {step === "pickTo" ? (
              <button
                type="button"
                onClick={() => {
                  setStep("pickFrom");
                  setFromZone(null);
                  setFromSlotIdx(null);
                }}
                className="px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800"
              >
                Back
              </button>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
