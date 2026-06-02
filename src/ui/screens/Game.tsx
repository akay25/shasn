// Main game screen during ideology / actions / headlines. Layout:
//   [ resizable left sidebar | map | HQ Mat ]
//   sidebar holds player summaries + active player's ideology collection,
//   with the Conspiracy/Headline deck panel pinned to the bottom.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useDispatch, useLastError, useClearError } from "@/ui/hooks/useDispatch";
import {
  activePlayer,
  pendingVoterCount,
  totalResources,
} from "@/engine/selectors";
import MapBoard from "@/ui/components/MapBoard";
import HqMat from "@/ui/components/HqMat";
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
  | { kind: "gerry" }
  | { kind: "trade" }
  | { kind: "conspiracy"; cardId?: string }
  | { kind: "power"; ideologue: Ideologue; level: 3 | 5 };

const SIDEBAR_MIN = 220;
const SIDEBAR_MAX_FRACTION = 0.2;          // 20% of viewport width
const SIDEBAR_DEFAULT = 280;
const SIDEBAR_STORAGE_KEY = "shashn-online:sidebarWidth";

function sidebarMaxWidth(): number {
  // SSR/test guard — fall back to a sensible upper bound when there's no
  // window. The real cap is recomputed on every drag tick and on resize.
  if (typeof window === "undefined") return 560;
  return Math.floor(window.innerWidth * SIDEBAR_MAX_FRACTION);
}

function clampSidebar(n: number): number {
  return Math.max(SIDEBAR_MIN, Math.min(sidebarMaxWidth(), n));
}

function readSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT;
  const raw = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
  const n = raw ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return SIDEBAR_DEFAULT;
  return clampSidebar(n);
}

export default function Game() {
  const state = useGameStore((s) => s.state)!;
  const dispatch = useDispatch();
  const lastError = useLastError();
  const clearError = useClearError();

  const [modal, setModal] = useState<ModalKind>(null);
  const [placeOpen, setPlaceOpen] = useState(false);

  // Resizable sidebar width, persisted across reloads.
  const [sidebarWidth, setSidebarWidth] = useState<number>(readSidebarWidth);
  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [sidebarWidth]);

  // Drag-to-resize handle.
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startW: sidebarWidth };
      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const next = dragRef.current.startW + (ev.clientX - dragRef.current.startX);
        setSidebarWidth(clampSidebar(next));
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [sidebarWidth],
  );

  // If the viewport shrinks, re-clamp the sidebar so the 30% cap still holds.
  useEffect(() => {
    const onResize = () => setSidebarWidth((w) => clampSidebar(w));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  // While voters are pending, the map is the primary placement surface.
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
          continue;
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

      {/* Main:
              [ resizable sidebar | resize handle | map | HQ Mat ]
            The sidebar uses flex-col with the DeckPanel pinned at the bottom
            via mt-auto inside the inner flex container. */}
      <div className="flex-1 flex overflow-hidden">
        {/* Resizable sidebar */}
        <aside
          style={{ width: sidebarWidth }}
          className="flex flex-col bg-neutral-950 border-r border-neutral-800 shrink-0 overflow-hidden"
        >
          {/* Scrollable upper region */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {state.players.map((p, i) => (
              <PlayerSummary
                key={p.id}
                player={p}
                isActive={i === state.activePlayerIdx}
                isNext={i === (state.activePlayerIdx + 1) % state.players.length}
              />
            ))}
            <IdeologyCollection
              player={active}
              onUsePower={(ideologue, level) =>
                setModal({ kind: "power", ideologue, level })
              }
            />
          </div>
          {/* Pinned bottom */}
          <div className="p-3 border-t border-neutral-800 bg-neutral-950">
            <DeckPanel
              state={state}
              onBuyConspiracy={() => dispatch({ t: "buyConspiracy", payment: {} })}
              buyConspiracyDisabled={!inActions || state.decks.conspiracy.length === 0}
            />
          </div>
        </aside>

        {/* Drag handle */}
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onMouseDown={onResizeStart}
          onDoubleClick={() => setSidebarWidth(SIDEBAR_DEFAULT)}
          title="Drag to resize · double-click to reset"
          className="w-1.5 shrink-0 cursor-col-resize bg-neutral-800 hover:bg-blue-500/70 active:bg-blue-500 transition-colors"
        />

        {/* Map + HQ */}
        <div className="flex-1 grid grid-cols-[minmax(0,1fr)_320px] gap-3 p-3 overflow-hidden">
          <div className="overflow-y-auto flex items-start">
            <div className="w-full">
              <MapBoard
                state={state}
                selectableSlots={selectableSlots}
                onSlotClick={onMapSlotClick}
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            <HqMat
              state={state}
              onInfluenceClick={(openIdx) =>
                inActions && setModal({ kind: "influence", openIdx })
              }
            />
          </div>
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
