// Choose how to pay the cost of an open Voter Card. The cost shape allows
// `any` slots which the player fills with a resource of their choice.
import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { GameState, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { VOTER_CARDS } from "@/data/cards/voter";
import { activePlayer } from "@/engine/selectors";
import { useDispatch } from "@/ui/hooks/useDispatch";
import {
  RESOURCE_BG,
  RESOURCE_COLOR,
  RESOURCE_GLYPH,
  RESOURCE_LABEL,
} from "./ResourceTrack";

interface Props {
  state: GameState;
  openIdx: 0 | 1 | 2;
  onClose: () => void;
}

export default function InfluenceVoterModal({ state, openIdx, onClose }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const cardId = state.openVoterCards[openIdx];
  const card = useMemo(() => VOTER_CARDS.find((c) => c.id === cardId), [cardId]);

  const baseCost = useMemo<Record<Resource, number>>(() => {
    const out: Record<Resource, number> = { funds: 0, clout: 0, media: 0, trust: 0 };
    if (card) {
      for (const r of RESOURCES) out[r] = card.cost[r] ?? 0;
    }
    return out;
  }, [card]);

  const anyNeeded = card?.cost.any ?? 0;
  const [anyAlloc, setAnyAlloc] = useState<Record<Resource, number>>({
    funds: 0,
    clout: 0,
    media: 0,
    trust: 0,
  });

  if (!card) {
    return (
      <Modal title="Influence voter card" onClose={onClose}>
        <div className="text-sm text-neutral-300">No card here.</div>
      </Modal>
    );
  }

  const anyAllocated = RESOURCES.reduce((s, r) => s + anyAlloc[r], 0);
  const payment: Partial<Record<Resource, number>> = {};
  for (const r of RESOURCES) {
    const n = baseCost[r] + anyAlloc[r];
    if (n > 0) payment[r] = n;
  }
  const canConfirm =
    anyAllocated === anyNeeded &&
    RESOURCES.every((r) => (payment[r] ?? 0) <= active.resources[r]);

  return (
    <Modal title={`Influence ${card.voters}-voter card`} onClose={onClose}>
      <div className="space-y-3">
        <div className="text-sm text-neutral-300">
          Cost:{" "}
          {RESOURCES.filter((r) => baseCost[r] > 0).map((r) => (
            <span key={r} className={`mr-2 font-bold ${RESOURCE_COLOR[r]}`}>
              {baseCost[r]}
              {RESOURCE_GLYPH[r]}
            </span>
          ))}
          {anyNeeded > 0 ? (
            <span className="text-neutral-300 font-bold">{anyNeeded}? (any)</span>
          ) : null}
        </div>

        {anyNeeded > 0 ? (
          <div className="space-y-2">
            <div className="text-xs text-neutral-400">
              Allocate {anyNeeded} from any resource(s). Allocated: {anyAllocated}/
              {anyNeeded}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {RESOURCES.map((r) => {
                const avail = active.resources[r] - baseCost[r];
                return (
                  <div
                    key={r}
                    className={`border ${RESOURCE_BG[r]} rounded p-2 flex flex-col items-center`}
                  >
                    <div className={`text-xs ${RESOURCE_COLOR[r]} font-bold`}>
                      {RESOURCE_GLYPH[r]} {RESOURCE_LABEL[r]}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      avail {Math.max(0, avail)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() =>
                          setAnyAlloc((s) => ({
                            ...s,
                            [r]: Math.max(0, s[r] - 1),
                          }))
                        }
                        className="px-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                      >
                        −
                      </button>
                      <span className="w-6 text-center tabular-nums">
                        {anyAlloc[r]}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setAnyAlloc((s) => {
                            if (avail - s[r] <= 0) return s;
                            if (anyAllocated >= anyNeeded) return s;
                            return { ...s, [r]: s[r] + 1 };
                          })
                        }
                        className="px-1 rounded bg-neutral-800 border border-neutral-700 hover:bg-neutral-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              dispatch({ t: "influenceVoterCard", openIdx, payment });
              onClose();
            }}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40"
          >
            Pay & influence
          </button>
        </div>
      </div>
    </Modal>
  );
}
