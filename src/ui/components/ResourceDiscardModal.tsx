// Forced when the active player is over their resource cap. They must discard
// exactly (totalResources - cap) resources, distributed however they choose.
import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { GameState, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { activePlayer, totalResources } from "@/engine/selectors";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { RESOURCE_BG, RESOURCE_COLOR, RESOURCE_LABEL, ResourceCoin } from "./ResourceTrack";

interface Props {
  state: GameState;
}

export default function ResourceDiscardModal({ state }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const tot = totalResources(active);
  const need = Math.max(0, tot - active.resourceCap);

  const [discards, setDiscards] = useState<Record<Resource, number>>({
    funds: 0,
    clout: 0,
    media: 0,
    trust: 0,
  });
  const totalDisc = useMemo(
    () => RESOURCES.reduce((s, r) => s + discards[r], 0),
    [discards],
  );

  const canConfirm = totalDisc === need;

  return (
    <Modal
      title={`Over resource cap — discard ${need}`}
      closable={false}
      wide
    >
      <div className="space-y-3">
        <div className="text-sm text-neutral-300">
          {active.name} has {tot} resources, cap is {active.resourceCap}. Discard
          exactly {need} resource{need === 1 ? "" : "s"} to continue.
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RESOURCES.map((r) => {
            const have = active.resources[r];
            const d = discards[r];
            return (
              <div
                key={r}
                className={`border ${RESOURCE_BG[r]} rounded p-2 flex flex-col items-center`}
              >
                <div className={`text-xs ${RESOURCE_COLOR[r]} font-bold inline-flex items-center gap-1`}>
                  <ResourceCoin resource={r} size="xs" /> {RESOURCE_LABEL[r]}
                </div>
                <div className="text-[10px] text-neutral-400">have {have}</div>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    type="button"
                    onClick={() =>
                      setDiscards((s) => ({ ...s, [r]: Math.max(0, s[r] - 1) }))
                    }
                    className="px-1 rounded bg-neutral-800 border border-neutral-700"
                  >
                    −
                  </button>
                  <span className="w-6 text-center tabular-nums">{d}</span>
                  <button
                    type="button"
                    disabled={d >= have || totalDisc >= need}
                    onClick={() =>
                      setDiscards((s) => ({ ...s, [r]: Math.min(have, s[r] + 1) }))
                    }
                    className="px-1 rounded bg-neutral-800 border border-neutral-700 disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-neutral-400">
          Discarded {totalDisc} / {need}
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!canConfirm}
            onClick={() => {
              const out: Partial<Record<Resource, number>> = {};
              for (const r of RESOURCES) if (discards[r] > 0) out[r] = discards[r];
              dispatch({ t: "discardResources", discards: out });
              setDiscards({ funds: 0, clout: 0, media: 0, trust: 0 });
            }}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40"
          >
            Discard
          </button>
        </div>
      </div>
    </Modal>
  );
}
