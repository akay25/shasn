// Forced modal during the "headlines" phase. Shows the next pending headline
// and prompts the active player to resolve it. The engine pops one headline
// per resolveHeadline action; this modal stays open until pendingHeadlines = 0.
import { useState } from "react";
import Modal from "./Modal";
import ArtPopCard from "./ArtPopCard";
import type { GameState } from "@/engine/types";
import { HEADLINE_CARDS } from "@/data/cards/headline";
import headlineArt from "@/assets/art/headline.jpg";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";

interface Props {
  state: GameState;
}

export default function HeadlineModal({ state }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const nextId = state.decks.headline[0] ?? null;
  const card = nextId ? HEADLINE_CARDS.find((c) => c.id === nextId) : null;

  const kind = card?.effect.kind;
  const [moveZone, setMoveZone] = useState<string>("");
  const [moveSlot, setMoveSlot] = useState<number>(0);
  const [moveToZone, setMoveToZone] = useState<string>("");
  const [moveToSlot, setMoveToSlot] = useState<number>(0);

  const submit = () => {
    let params: Record<string, unknown> = {};
    if (kind === "moveVoter") {
      params = {
        fromZone: moveZone,
        fromSlotIdx: moveSlot,
        toZone: moveToZone,
        toSlotIdx: moveToSlot,
      };
    }
    dispatch({ t: "resolveHeadline", params });
  };

  return (
    <Modal title={`Headline — ${active.name}'s turn`} closable={false} wide>
      <div className="space-y-3">
        <div className="text-xs text-neutral-400">
          {state.pendingHeadlines} headline{state.pendingHeadlines === 1 ? "" : "s"} pending.
        </div>
        {card ? (
          <>
            <ArtPopCard
              image={headlineArt}
              eyebrow="Headline"
              name={card.name}
              description={card.description}
            />
            <div className="text-[10px] text-neutral-500">effect: {card.effect.kind}</div>
          </>
        ) : (
          <div className="text-sm text-neutral-300">Drawing next headline…</div>
        )}

        {kind === "moveVoter" ? (
          <div className="space-y-2">
            <div className="text-xs text-neutral-400">Pick your voter to move, and a target.</div>
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs">
                <div className="text-neutral-400">From zone</div>
                <select
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-full"
                  value={moveZone}
                  onChange={(e) => setMoveZone(e.target.value)}
                >
                  <option value="">—</option>
                  {state.board.zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <div className="text-neutral-400">From slot idx</div>
                <input
                  type="number"
                  min={0}
                  value={moveSlot}
                  onChange={(e) => setMoveSlot(Math.max(0, Number(e.target.value) || 0))}
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-full"
                />
              </label>
              <label className="text-xs">
                <div className="text-neutral-400">To zone</div>
                <select
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-full"
                  value={moveToZone}
                  onChange={(e) => setMoveToZone(e.target.value)}
                >
                  <option value="">—</option>
                  {state.board.zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <div className="text-neutral-400">To slot idx</div>
                <input
                  type="number"
                  min={0}
                  value={moveToSlot}
                  onChange={(e) => setMoveToSlot(Math.max(0, Number(e.target.value) || 0))}
                  className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 w-full"
                />
              </label>
            </div>
          </div>
        ) : null}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={submit}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600"
          >
            Resolve
          </button>
        </div>
      </div>
    </Modal>
  );
}
