// Main game screen during ideology / actions / headlines. 3-column layout:
// PlayerSummaries | Board+HQ | PlayerMat. Forced modals overlay as needed.
import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useDispatch, useLastError, useClearError } from "@/ui/hooks/useDispatch";
import {
  activePlayer,
  pendingVoterCount,
  totalResources,
} from "@/engine/selectors";
import MapBoard from "@/ui/components/MapBoard";
import HqMat from "@/ui/components/HqMat";
import PlayerMat from "@/ui/components/PlayerMat";
import PlayerSummary from "@/ui/components/PlayerSummary";
import IdeologyCollection from "@/ui/components/IdeologyCollection";
import DeckPanel from "@/ui/components/DeckPanel";
import ActionBar from "@/ui/components/ActionBar";
import IdeologyCardModal from "@/ui/components/IdeologyCardModal";
import InfluenceVoterModal from "@/ui/components/InfluenceVoterModal";
import PlaceVoterModal from "@/ui/components/PlaceVoterModal";
import GerrymanderModal from "@/ui/components/GerrymanderModal";
import TradeModal from "@/ui/components/TradeModal";
import ConspiracyModal from "@/ui/components/ConspiracyModal";
import PowerModal from "@/ui/components/PowerModal";
import HeadlineModal from "@/ui/components/HeadlineModal";
import ResourceDiscardModal from "@/ui/components/ResourceDiscardModal";
import type { Ideologue } from "@/engine/types";

type ModalKind =
  | null
  | { kind: "influence"; openIdx: 0 | 1 | 2 }
  | { kind: "place" }
  | { kind: "gerry" }
  | { kind: "trade" }
  | { kind: "conspiracy"; cardId?: string }
  | { kind: "power"; ideologue: Ideologue; level: 3 | 5 };

export default function Game() {
  const state = useGameStore((s) => s.state)!;
  const dispatch = useDispatch();
  const lastError = useLastError();
  const clearError = useClearError();

  const [modal, setModal] = useState<ModalKind>(null);
  const [placeOpen, setPlaceOpen] = useState(false);

  // Auto-toast clear after 3.5s.
  useEffect(() => {
    if (!lastError) return;
    const t = setTimeout(() => clearError(), 3500);
    return () => clearTimeout(t);
  }, [lastError, clearError]);

  // Auto-open place modal whenever pending placements appear and the user
  // hasn't dismissed it yet (banner click reopens).
  const pending = pendingVoterCount(state);
  useEffect(() => {
    if (pending > 0) setPlaceOpen(true);
  }, [pending]);

  const active = activePlayer(state);
  const overCap = totalResources(active) > active.resourceCap;
  const inActions = state.phase === "actions";

  // While voters are pending, the map is the primary placement surface: clicking
  // an empty, valid slot places the next voter of the first pending group. We
  // compute which empty slots are valid (mirrors PlaceVoterModal: a voter-card
  // bundle must land wholly in one zone) so the canvas can highlight them.
  const pendingGroup = state.pendingPlacements[0];
  const selectableSlots = useMemo(() => {
    if (!pendingGroup) return undefined;
    const isCard = pendingGroup.source === "voterCard" && !!pendingGroup.voterCardId;
    const out: Record<string, number[]> = {};
    for (const z of state.board.zones) {
      const empties: number[] = [];
      state.zones[z.id].slots.forEach((s, i) => {
        if (s === null) empties.push(i);
      });
      if (empties.length === 0) continue;
      if (isCard) {
        if (pendingGroup.committedZoneId) {
          if (pendingGroup.committedZoneId !== z.id) continue;
        } else if (empties.length < pendingGroup.voters.length) {
          continue; // whole bundle can't fit here
        }
      }
      out[z.id] = empties;
    }
    return out;
  }, [state, pendingGroup]);

  const onMapSlotClick =
    pending > 0
      ? (zoneId: string, slotIdx: number) =>
          dispatch({ t: "placeVoter", zoneId, slotIdx, pendingIdx: 0 })
      : undefined;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60">
        <div className="font-bold">
          SHASN — Turn {state.turn} ·{" "}
          <span className="text-neutral-300">{state.phase}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-neutral-400">
            {state.players.length} players · {active.name}'s turn
          </div>
          <button
            type="button"
            onClick={() => dispatch({ t: "endTurn" })}
            disabled={!(inActions && pending === 0 && !overCap)}
            title={
              !inActions
                ? "Not in the actions phase"
                : pending > 0
                ? "Place all pending voters first"
                : overCap
                ? "Discard down to your resource cap first"
                : "End your turn"
            }
            className="px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white text-sm font-semibold"
          >
            End Turn
          </button>
        </div>
      </div>

      {/* Pending placement banner */}
      {pending > 0 ? (
        <button
          type="button"
          onClick={() => setPlaceOpen(true)}
          className="bg-amber-700/30 border-b border-amber-700/60 text-amber-100 px-4 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-white"
        >
          {pending} voter{pending === 1 ? "" : "s"} pending placement. Click to place
          (unplaced voters discard at end of turn).
        </button>
      ) : null}

      {/* 3-column main:
            left  — player summaries, then active player's ideology
                    collection, then conspiracy/headline deck pile counts
            centre — the territorial map (dominant, landscape)
            right — HQ Mat (voter cards + voter/ideology deck) above
                    PlayerMat (identity + resources + conspiracy hand) */}
      <div className="flex-1 grid grid-cols-[260px_minmax(0,1fr)_320px] gap-3 p-3 overflow-hidden">
        {/* Left: summaries, ideology collection, decks */}
        <div className="flex flex-col gap-2 overflow-y-auto">
          {state.players.map((p, i) => (
            <PlayerSummary
              key={p.id}
              player={p}
              isActive={i === state.activePlayerIdx}
              isNext={
                i === (state.activePlayerIdx + 1) % state.players.length
              }
            />
          ))}
          <IdeologyCollection
            player={active}
            onUsePower={(ideologue, level) =>
              setModal({ kind: "power", ideologue, level })
            }
          />
          <DeckPanel
            state={state}
            onBuyConspiracy={() =>
              dispatch({ t: "buyConspiracy", payment: {} })
            }
            buyConspiracyDisabled={!inActions || state.decks.conspiracy.length === 0}
          />
        </div>

        {/* Centre: the map */}
        <div className="overflow-y-auto flex items-start">
          <div className="w-full">
            <MapBoard
              state={state}
              selectableSlots={selectableSlots}
              onSlotClick={onMapSlotClick}
            />
          </div>
        </div>

        {/* Right: HQ Mat on top, active PlayerMat below */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          <HqMat
            state={state}
            onInfluenceClick={(openIdx) =>
              inActions && setModal({ kind: "influence", openIdx })
            }
          />
          <PlayerMat
            player={active}
            onPlayConspiracy={(cardId) =>
              setModal({ kind: "conspiracy", cardId })
            }
          />
        </div>
      </div>

      <ActionBar
        onGerrymander={() => setModal({ kind: "gerry" })}
        onTrade={() => setModal({ kind: "trade" })}
        onPlayConspiracy={() => setModal({ kind: "conspiracy" })}
        onBuyConspiracy={() => dispatch({ t: "buyConspiracy", payment: {} })}
        canPlayConspiracy={active.conspiracyHand.length > 0}
        canBuyConspiracy={state.decks.conspiracy.length > 0}
        inActionsPhase={inActions}
      />

      {/* Error toast */}
      {lastError ? (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-700/90 border border-red-500 text-white px-4 py-2 rounded shadow-lg max-w-md text-sm z-40">
          {lastError}
          <button
            type="button"
            onClick={clearError}
            className="ml-2 underline text-red-200 hover:text-white"
          >
            dismiss
          </button>
        </div>
      ) : null}

      {/* Forced modals (highest priority) */}
      {state.phase === "ideology" ? <IdeologyCardModal state={state} /> : null}
      {state.phase === "headlines" && state.pendingHeadlines > 0 ? (
        <HeadlineModal state={state} />
      ) : null}
      {overCap ? <ResourceDiscardModal state={state} /> : null}

      {/* Place voter modal (opens automatically while pending) */}
      {placeOpen && pending > 0 ? (
        <PlaceVoterModal state={state} onClose={() => setPlaceOpen(false)} />
      ) : null}

      {/* Optional modals */}
      {modal?.kind === "influence" ? (
        <InfluenceVoterModal
          state={state}
          openIdx={modal.openIdx}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === "gerry" ? (
        <GerrymanderModal state={state} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === "trade" ? (
        <TradeModal state={state} onClose={() => setModal(null)} />
      ) : null}
      {modal?.kind === "conspiracy" ? (
        <ConspiracyModal
          state={state}
          initialCardId={modal.cardId}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal?.kind === "power" ? (
        <PowerModal
          state={state}
          ideologue={modal.ideologue}
          level={modal.level}
          onClose={() => setModal(null)}
        />
      ) : null}
    </div>
  );
}
