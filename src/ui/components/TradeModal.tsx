// Two-sided trade UI. The active player builds a "give" and "receive" bundle
// against a chosen opponent; engine validates that both sides include at
// least 1 item (rulebook: at least 1 resource must be exchanged by both).
import { useMemo, useState } from "react";
import Modal from "./Modal";
import type {
  GameState,
  Resource,
  TradeBundle,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";
import {
  RESOURCE_BG,
  RESOURCE_COLOR,
  RESOURCE_GLYPH,
  RESOURCE_LABEL,
} from "./ResourceTrack";

interface Props {
  state: GameState;
  onClose: () => void;
}

const ZERO_RES: Record<Resource, number> = {
  funds: 0,
  clout: 0,
  media: 0,
  trust: 0,
};

export default function TradeModal({ state, onClose }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const opponents = state.players.filter((p) => p.id !== active.id);

  const [withId, setWithId] = useState<string>(opponents[0]?.id ?? "");
  const opp = useMemo(
    () => state.players.find((p) => p.id === withId),
    [state.players, withId],
  );

  const [giveRes, setGiveRes] = useState<Record<Resource, number>>({ ...ZERO_RES });
  const [recvRes, setRecvRes] = useState<Record<Resource, number>>({ ...ZERO_RES });
  const [giveCards, setGiveCards] = useState<string[]>([]);
  const [recvCards, setRecvCards] = useState<string[]>([]);

  if (!opp) {
    return (
      <Modal title="Trade" onClose={onClose}>
        <div className="text-sm text-neutral-300">No opponents to trade with.</div>
      </Modal>
    );
  }

  const giveTotal =
    RESOURCES.reduce((s, r) => s + giveRes[r], 0) + giveCards.length;
  const recvTotal =
    RESOURCES.reduce((s, r) => s + recvRes[r], 0) + recvCards.length;
  const canTrade = giveTotal > 0 && recvTotal > 0;

  // selectedCards entries are `${cardId}-${index}` — split to send raw ids.
  const giveCardIds = giveCards.map((k) => k.slice(0, k.lastIndexOf("-")));
  const recvCardIds = recvCards.map((k) => k.slice(0, k.lastIndexOf("-")));
  const give: TradeBundle = {
    resources: Object.fromEntries(
      RESOURCES.filter((r) => giveRes[r] > 0).map((r) => [r, giveRes[r]]),
    ),
    conspiracyCardIds: giveCardIds.length > 0 ? giveCardIds : undefined,
  };
  const receive: TradeBundle = {
    resources: Object.fromEntries(
      RESOURCES.filter((r) => recvRes[r] > 0).map((r) => [r, recvRes[r]]),
    ),
    conspiracyCardIds: recvCardIds.length > 0 ? recvCardIds : undefined,
  };

  return (
    <Modal title={`Trade with…`} onClose={onClose} wide>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-neutral-400 mr-2">Partner:</label>
          <select
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
            value={withId}
            onChange={(e) => {
              setWithId(e.target.value);
              setRecvRes({ ...ZERO_RES });
              setRecvCards([]);
            }}
          >
            {opponents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <SideEditor
            title={`${active.name} gives`}
            resources={giveRes}
            setResources={setGiveRes}
            availableResources={active.resources}
            availableCards={active.conspiracyHand}
            selectedCards={giveCards}
            setSelectedCards={setGiveCards}
          />
          <SideEditor
            title={`${opp.name} gives`}
            resources={recvRes}
            setResources={setRecvRes}
            availableResources={opp.resources}
            availableCards={opp.conspiracyHand}
            selectedCards={recvCards}
            setSelectedCards={setRecvCards}
          />
        </div>

        <div className="text-xs text-neutral-400">
          Rulebook: at least 1 resource (or card) must be exchanged on both
          sides; trades cannot be 0-for-something or one-sided.
        </div>

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
            disabled={!canTrade}
            onClick={() => {
              dispatch({ t: "trade", withPlayerId: opp.id, give, receive });
              onClose();
            }}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40"
          >
            Propose & execute
          </button>
        </div>
      </div>
    </Modal>
  );
}

function SideEditor(props: {
  title: string;
  resources: Record<Resource, number>;
  setResources: (r: Record<Resource, number>) => void;
  availableResources: Record<Resource, number>;
  availableCards: string[];
  selectedCards: string[];
  setSelectedCards: (s: string[]) => void;
}) {
  const {
    title,
    resources,
    setResources,
    availableResources,
    availableCards,
    selectedCards,
    setSelectedCards,
  } = props;
  return (
    <div className="bg-neutral-900/70 border border-neutral-700 rounded-lg p-2">
      <div className="text-xs uppercase tracking-wide text-neutral-400 mb-1">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {RESOURCES.map((r) => {
          const avail = availableResources[r] ?? 0;
          return (
            <div
              key={r}
              className={`border ${RESOURCE_BG[r]} rounded p-1 flex items-center justify-between`}
            >
              <span className={`text-xs ${RESOURCE_COLOR[r]} font-bold`} title={RESOURCE_LABEL[r]}>
                {RESOURCE_GLYPH[r]} {avail}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    setResources({
                      ...resources,
                      [r]: Math.max(0, resources[r] - 1),
                    })
                  }
                  className="px-1 rounded bg-neutral-800 border border-neutral-700"
                >
                  −
                </button>
                <span className="w-5 text-center tabular-nums">{resources[r]}</span>
                <button
                  type="button"
                  disabled={resources[r] >= avail}
                  onClick={() =>
                    setResources({
                      ...resources,
                      [r]: Math.min(avail, resources[r] + 1),
                    })
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
      <div className="mt-2">
        <div className="text-[10px] text-neutral-400 mb-1">Conspiracy cards</div>
        {availableCards.length === 0 ? (
          <div className="text-xs text-neutral-500">none</div>
        ) : (
          <ul className="space-y-1">
            {availableCards.map((id, i) => {
              const card = CONSPIRACY_CARDS.find((c) => c.id === id);
              const k = `${id}-${i}`;
              const isSel = selectedCards.includes(k);
              return (
                <li key={k} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={isSel}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCards([...selectedCards, k]);
                      else setSelectedCards(selectedCards.filter((x) => x !== k));
                    }}
                  />
                  <span>{card?.name ?? id}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
