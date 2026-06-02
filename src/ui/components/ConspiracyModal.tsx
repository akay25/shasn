// Conspiracy card play modal. The active player picks a card from hand and
// (depending on its effect kind) supplies additional params before dispatching.
import { useState } from "react";
import Modal from "./Modal";
import type {
  ConspiracyEffectKind,
  GameState,
  PlayerId,
  Resource,
} from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";
import { RESOURCE_COLOR, ResourceCoin } from "./ResourceTrack";

interface Props {
  state: GameState;
  initialCardId?: string;
  onClose: () => void;
}

interface EffectParams {
  // discardOpponentVoter
  targetPlayerId?: PlayerId;
  zoneId?: string;
  slotIdx?: number;
  // gainResources
  resources?: Partial<Record<Resource, number>>;
  // peekConspiracy: same targetPlayerId
  // extraVoterCard
  openIdx?: 0 | 1 | 2;
  // swapVoters
  zoneA?: string;
  slotA?: number;
  zoneB?: string;
  slotB?: number;
}

export default function ConspiracyModal({ state, initialCardId, onClose }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const opponents = state.players.filter((p) => p.id !== active.id);
  const [cardId, setCardId] = useState<string>(
    initialCardId ?? active.conspiracyHand[0] ?? "",
  );
  const [params, setParams] = useState<EffectParams>({});

  const card = CONSPIRACY_CARDS.find((c) => c.id === cardId);
  const kind: ConspiracyEffectKind | undefined = card?.effect.kind;

  const submit = () => {
    if (!card) return;
    dispatch({ t: "playConspiracy", cardId: card.id, params: params as Record<string, unknown> });
    onClose();
  };

  return (
    <Modal title="Play conspiracy card" onClose={onClose} wide>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-neutral-400 mr-2">Card:</label>
          <select
            className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
            value={cardId}
            onChange={(e) => {
              setCardId(e.target.value);
              setParams({});
            }}
          >
            {active.conspiracyHand.length === 0 ? (
              <option value="">(none)</option>
            ) : null}
            {active.conspiracyHand.map((id, i) => {
              const c = CONSPIRACY_CARDS.find((cc) => cc.id === id);
              return (
                <option key={`${id}-${i}`} value={id}>
                  {c?.name ?? id}
                </option>
              );
            })}
          </select>
        </div>

        {card ? (
          <div className="text-xs text-neutral-400 bg-neutral-900/70 border border-neutral-700 rounded p-2">
            <div className="font-semibold text-neutral-200 text-sm">{card.name}</div>
            <div>{card.description}</div>
            <div className="text-neutral-500 mt-1">
              Effect: {card.effect.kind} · Cost: {card.cost} (already paid when bought)
            </div>
          </div>
        ) : null}

        {kind === "discardOpponentVoter" || kind === "peekConspiracy" ? (
          <div>
            <label className="text-xs text-neutral-400 mr-2">Target opponent:</label>
            <select
              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
              value={params.targetPlayerId ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, targetPlayerId: e.target.value }))
              }
            >
              <option value="">— pick —</option>
              {opponents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === "discardOpponentVoter" ? (
          <ZoneSlotPicker
            label="Voter to discard"
            zones={state.board.zones}
            zoneId={params.zoneId}
            slotIdx={params.slotIdx}
            onChange={(zoneId, slotIdx) => setParams((p) => ({ ...p, zoneId, slotIdx }))}
          />
        ) : null}

        {kind === "swapVoters" ? (
          <>
            <ZoneSlotPicker
              label="Voter A"
              zones={state.board.zones}
              zoneId={params.zoneA}
              slotIdx={params.slotA}
              onChange={(zoneA, slotA) => setParams((p) => ({ ...p, zoneA, slotA }))}
            />
            <ZoneSlotPicker
              label="Voter B"
              zones={state.board.zones}
              zoneId={params.zoneB}
              slotIdx={params.slotB}
              onChange={(zoneB, slotB) => setParams((p) => ({ ...p, zoneB, slotB }))}
            />
          </>
        ) : null}

        {kind === "extraVoterCard" ? (
          <div>
            <label className="text-xs text-neutral-400 mr-2">Open voter card slot:</label>
            <select
              className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
              value={params.openIdx ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, openIdx: Number(e.target.value) as 0 | 1 | 2 }))
              }
            >
              <option value="">— pick —</option>
              {[0, 1, 2].map((i) => (
                <option key={i} value={i}>
                  Slot {i + 1}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === "gainResources" ? (
          <div className="space-y-1">
            <div className="text-xs text-neutral-400">Resources to gain:</div>
            <div className="grid grid-cols-4 gap-2">
              {RESOURCES.map((r) => {
                const n = params.resources?.[r] ?? 0;
                return (
                  <div
                    key={r}
                    className="flex items-center justify-between border border-neutral-700 rounded p-1"
                  >
                    <span className={`text-xs ${RESOURCE_COLOR[r]} font-bold inline-flex items-center`}>
                      <ResourceCoin resource={r} size="xs" />
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setParams((p) => ({
                            ...p,
                            resources: { ...(p.resources ?? {}), [r]: Math.max(0, n - 1) },
                          }))
                        }
                        className="px-1 rounded bg-neutral-800 border border-neutral-700"
                      >
                        −
                      </button>
                      <span className="w-5 text-center tabular-nums">{n}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setParams((p) => ({
                            ...p,
                            resources: { ...(p.resources ?? {}), [r]: n + 1 },
                          }))
                        }
                        className="px-1 rounded bg-neutral-800 border border-neutral-700"
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
            disabled={!card}
            onClick={submit}
            className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40"
          >
            Play
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ZoneSlotPicker({
  label,
  zones,
  zoneId,
  slotIdx,
  onChange,
}: {
  label: string;
  zones: GameState["board"]["zones"];
  zoneId?: string;
  slotIdx?: number;
  onChange: (zoneId: string, slotIdx: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <label className="text-xs text-neutral-400">{label}:</label>
      <select
        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm"
        value={zoneId ?? ""}
        onChange={(e) => onChange(e.target.value, slotIdx ?? 0)}
      >
        <option value="">— zone —</option>
        {zones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
      </select>
      <input
        type="number"
        min={0}
        className="bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-sm w-16"
        value={slotIdx ?? 0}
        onChange={(e) =>
          onChange(zoneId ?? "", Math.max(0, Number(e.target.value) || 0))
        }
      />
    </div>
  );
}
