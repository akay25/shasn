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
import MapBoard, { type MapBoardHandle } from "@/ui/components/MapBoard";
import HqMat from "@/ui/components/HqMat";
import PlayerSummary from "@/ui/components/PlayerSummary";
import IdeologyCollection from "@/ui/components/IdeologyCollection";
import ConspiracyBuyPanel from "@/ui/components/ConspiracyBuyPanel";
import DeckStats from "@/ui/components/DeckStats";
import ActionBar from "@/ui/components/ActionBar";
import IdeologyCardModal from "@/ui/components/IdeologyCardModal";
import InfluenceVoterModal from "@/ui/components/InfluenceVoterModal";
import GerrymanderModal from "@/ui/components/GerrymanderModal";
import TradeModal from "@/ui/components/TradeModal";
import ConspiracyModal from "@/ui/components/ConspiracyModal";
import PowerModal from "@/ui/components/PowerModal";
import HeadlineModal from "@/ui/components/HeadlineModal";
import ResourceDiscardModal from "@/ui/components/ResourceDiscardModal";
import FloatingPlacementPanel, {
  type PendingPeg,
} from "@/ui/components/FloatingPlacementPanel";
import { PLAYER_COLOR_HEX } from "@/ui/components/PlayerColorSwatch";
import type { Ideologue, PlayerColor } from "@/engine/types";

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

type PegKey = string;  // `${bundleIdx}:${voterIdx}`
type CellKey = string; // `${zoneId},${slotIdx}`

export default function Game() {
  const state = useGameStore((s) => s.state)!;
  const dispatch = useDispatch();
  const lastError = useLastError();
  const clearError = useClearError();

  const [modal, setModal] = useState<ModalKind>(null);

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
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);
  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizeRef.current = { startX: e.clientX, startW: sidebarWidth };
      const onMove = (ev: MouseEvent) => {
        if (!resizeRef.current) return;
        const next = resizeRef.current.startW + (ev.clientX - resizeRef.current.startX);
        setSidebarWidth(clampSidebar(next));
      };
      const onUp = () => {
        resizeRef.current = null;
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

  // If the viewport shrinks, re-clamp the sidebar so the cap still holds.
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

  const pending = pendingVoterCount(state);
  const active = activePlayer(state);
  const overCap = totalResources(active) > active.resourceCap;
  const inActions = state.phase === "actions";

  // ---- Drag-and-drop voter placement -------------------------------------

  // Flat list of every pending peg + its owner's colour.
  const pegList = useMemo<PendingPeg[]>(() => {
    const out: PendingPeg[] = [];
    state.pendingPlacements.forEach((bundle, bIdx) => {
      bundle.voters.forEach((ownerId, vIdx) => {
        const player = state.players.find((p) => p.id === ownerId);
        out.push({
          key: `${bIdx}:${vIdx}`,
          bundleIdx: bIdx,
          ownerColor: (player?.color ?? "red") as PlayerColor,
        });
      });
    });
    return out;
  }, [state.pendingPlacements, state.players]);

  // pegKey → bundleIdx lookup
  const pegToBundle = useMemo(() => {
    const m: Record<PegKey, number> = {};
    pegList.forEach((p) => { m[p.key] = p.bundleIdx; });
    return m;
  }, [pegList]);

  // Local draft: { pegKey → cellKey }. Cleared on save / reset / when the
  // engine drains pendingPlacements (after a successful save).
  const [drafts, setDrafts] = useState<Record<PegKey, CellKey>>({});
  useEffect(() => {
    // If the engine has nothing left to place, the local drafts are stale.
    if (state.pendingPlacements.length === 0 && Object.keys(drafts).length > 0) {
      setDrafts({});
    }
  }, [state.pendingPlacements.length, drafts]);

  // Drop any draft entries that don't correspond to a current peg (e.g.
  // after end-of-turn discards) so we don't leak references.
  useEffect(() => {
    setDrafts((d) => {
      const validKeys = new Set(pegList.map((p) => p.key));
      let changed = false;
      const next: Record<PegKey, CellKey> = {};
      for (const [k, v] of Object.entries(d)) {
        if (validKeys.has(k)) next[k] = v;
        else changed = true;
      }
      return changed ? next : d;
    });
  }, [pegList]);

  const draftedPegKeys = useMemo(
    () => new Set(Object.keys(drafts)),
    [drafts],
  );
  const draftedCellKeys = useMemo(
    () => new Set(Object.values(drafts)),
    [drafts],
  );

  // For each bundle, the zone it's "locked" to: committed in engine state, or
  // implied by an existing draft. `null` = still free.
  const lockedZoneByBundle = useMemo(() => {
    const out: Record<number, string | null> = {};
    state.pendingPlacements.forEach((bundle, bIdx) => {
      if (bundle.source !== "voterCard") {
        out[bIdx] = null;
        return;
      }
      if (bundle.committedZoneId) {
        out[bIdx] = bundle.committedZoneId;
        return;
      }
      let locked: string | null = null;
      for (const [pegKey, cellKey] of Object.entries(drafts)) {
        if (pegToBundle[pegKey] === bIdx) {
          locked = cellKey.split(",")[0];
          break;
        }
      }
      out[bIdx] = locked;
    });
    return out;
  }, [state.pendingPlacements, drafts, pegToBundle]);

  // Highlight set for the map — union of every valid cell an unplaced peg
  // could legitimately drop on.
  const selectableSlots = useMemo(() => {
    if (pegList.length === 0) return undefined;
    const out: Record<string, number[]> = {};
    pegList.forEach((peg) => {
      if (draftedPegKeys.has(peg.key)) return;
      const lockedZone = lockedZoneByBundle[peg.bundleIdx];
      for (const z of state.board.zones) {
        if (lockedZone && z.id !== lockedZone) continue;
        state.zones[z.id].slots.forEach((s, i) => {
          if (s !== null) return;
          const cellKey = `${z.id},${i}`;
          if (draftedCellKeys.has(cellKey)) return;
          if (!out[z.id]) out[z.id] = [];
          if (!out[z.id].includes(i)) out[z.id].push(i);
        });
      }
    });
    return out;
  }, [pegList, draftedPegKeys, draftedCellKeys, lockedZoneByBundle, state.board.zones, state.zones]);

  // Draft preview pegs for the map overlay.
  const draftPegs = useMemo(() => {
    return Object.entries(drafts).map(([pegKey, cellKey]) => {
      const [zoneId, slotIdxStr] = cellKey.split(",");
      const peg = pegList.find((p) => p.key === pegKey);
      return {
        pegKey,
        zoneId,
        slotIdx: Number(slotIdxStr),
        color: peg ? PLAYER_COLOR_HEX[peg.ownerColor] : "#777777",
      };
    });
  }, [drafts, pegList]);

  // Drag state
  const [dragging, setDragging] = useState<{
    pegKey: PegKey;
    color: string;
    cursor: { x: number; y: number };
    overVolatile: boolean;
    canDrop: boolean;
  } | null>(null);

  const mapRef = useRef<MapBoardHandle>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const cellValidForPeg = useCallback(
    (pegKey: PegKey, zoneId: string, slotIdx: number, cellKey: CellKey): boolean => {
      const bIdx = pegToBundle[pegKey];
      if (bIdx === undefined) return false;
      if (state.zones[zoneId].slots[slotIdx] !== null) return false;
      const occupier = Object.entries(drafts).find(([, v]) => v === cellKey)?.[0];
      if (occupier && occupier !== pegKey) return false;
      const lockedZone = lockedZoneByBundle[bIdx];
      if (lockedZone && lockedZone !== zoneId) return false;
      return true;
    },
    [pegToBundle, state.zones, drafts, lockedZoneByBundle],
  );

  // Start a drag — called from FloatingPlacementPanel or the draft overlay.
  const startDrag = useCallback(
    (pegKey: PegKey, e: React.PointerEvent) => {
      const peg = pegList.find((p) => p.key === pegKey);
      if (!peg) return;
      setDragging({
        pegKey,
        color: PLAYER_COLOR_HEX[peg.ownerColor],
        cursor: { x: e.clientX, y: e.clientY },
        overVolatile: false,
        canDrop: false,
      });
    },
    [pegList],
  );

  // Global pointer move / up — drives the ghost peg and resolves the drop.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const hit = mapRef.current?.getCellAtPoint(e.clientX, e.clientY) ?? null;
      const cellKey = hit ? `${hit.zoneId},${hit.slotIdx}` : null;
      const canDrop = !!(hit && cellKey && cellValidForPeg(dragging.pegKey, hit.zoneId, hit.slotIdx, cellKey));
      setDragging((d) =>
        d
          ? {
              ...d,
              cursor: { x: e.clientX, y: e.clientY },
              overVolatile: !!(hit && canDrop && hit.isVolatile),
              canDrop,
            }
          : d,
      );
    };
    const onUp = (e: PointerEvent) => {
      const pegKey = dragging.pegKey;

      // Try map drop.
      const hit = mapRef.current?.getCellAtPoint(e.clientX, e.clientY);
      if (hit) {
        const cellKey = `${hit.zoneId},${hit.slotIdx}`;
        if (cellValidForPeg(pegKey, hit.zoneId, hit.slotIdx, cellKey)) {
          setDrafts((d) => ({ ...d, [pegKey]: cellKey }));
          setDragging(null);
          return;
        }
      }

      // Try panel drop (un-place if it was already drafted).
      const pr = panelRef.current?.getBoundingClientRect();
      if (
        pr &&
        e.clientX >= pr.left && e.clientX <= pr.right &&
        e.clientY >= pr.top && e.clientY <= pr.bottom
      ) {
        setDrafts((d) => {
          if (!(pegKey in d)) return d;
          const next = { ...d };
          delete next[pegKey];
          return next;
        });
        setDragging(null);
        return;
      }

      // Otherwise: cancel — peg stays where it was.
      setDragging(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, cellValidForPeg]);

  // Save: dispatch placeVoter for each draft, in bundle-then-voter order.
  // Always passes pendingIdx = 0, which is correct because each bundle empties
  // (and gets removed) before we move to the next.
  const savePlacements = useCallback(() => {
    for (let bIdx = 0; bIdx < state.pendingPlacements.length; bIdx++) {
      const bundle = state.pendingPlacements[bIdx];
      for (let vIdx = 0; vIdx < bundle.voters.length; vIdx++) {
        const pegKey = `${bIdx}:${vIdx}`;
        const cellKey = drafts[pegKey];
        if (!cellKey) continue;
        const [zoneId, slotIdxStr] = cellKey.split(",");
        dispatch({ t: "placeVoter", zoneId, slotIdx: Number(slotIdxStr), pendingIdx: 0 });
      }
    }
    setDrafts({});
  }, [state.pendingPlacements, drafts, dispatch]);

  const resetPlacements = useCallback(() => setDrafts({}), []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-neutral-800 bg-neutral-900/60">
        <div className="font-bold">SHASN</div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-neutral-400">
            Turn {state.turn} · {active.name}'s turn
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

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Resizable sidebar */}
        <aside
          style={{ width: sidebarWidth }}
          className="flex flex-col bg-neutral-950 border-r border-neutral-800 shrink-0 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {state.players.map((p, i) => {
              const isActive = i === state.activePlayerIdx;
              const isNext = i === (state.activePlayerIdx + 1) % state.players.length;
              return (
                <div key={p.id} className="flex flex-col gap-2">
                  <PlayerSummary player={p} isActive={isActive} isNext={isNext} />
                  {isActive ? (
                    <IdeologyCollection
                      player={p}
                      onUsePower={(ideologue, level) =>
                        setModal({ kind: "power", ideologue, level })
                      }
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="p-3 border-t border-neutral-800 bg-neutral-950">
            <ConspiracyBuyPanel
              state={state}
              onBuyConspiracy={() => dispatch({ t: "buyConspiracy", payment: {} })}
              disabled={!inActions}
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

        {/* Map area — also hosts the floating placement panel when pending. */}
        <div className="flex-1 relative overflow-hidden">
          <MapBoard
            ref={mapRef}
            state={state}
            selectableSlots={selectableSlots}
            draftPegs={draftPegs}
            onDraftPegPointerDown={startDrag}
          />
          <div className="absolute top-3 right-3 z-10 w-[320px] max-w-[45%] shadow-xl">
            <HqMat
              state={state}
              onInfluenceClick={(openIdx) =>
                inActions && setModal({ kind: "influence", openIdx })
              }
            />
          </div>
          {pending > 0 ? (
            <div className="absolute top-3 left-3 z-20">
              <FloatingPlacementPanel
                ref={panelRef}
                pegs={pegList}
                draftedPegKeys={draftedPegKeys}
                draggingPegKey={dragging?.pegKey ?? null}
                onPegPointerDown={startDrag}
                onSave={savePlacements}
                onReset={resetPlacements}
              />
            </div>
          ) : null}
        </div>
      </div>

      <ActionBar
        onGerrymander={() => setModal({ kind: "gerry" })}
        onTrade={() => setModal({ kind: "trade" })}
        onPlayConspiracy={() => setModal({ kind: "conspiracy" })}
        canPlayConspiracy={active.conspiracyHand.length > 0}
        inActionsPhase={inActions}
        trailing={<DeckStats state={state} />}
      />

      {/* Drag ghost — a small disc + warning chip tracking the cursor while
          a peg is being dragged. */}
      {dragging ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] -translate-x-1/2 -translate-y-1/2"
          style={{ left: dragging.cursor.x, top: dragging.cursor.y }}
        >
          <div
            className={`rounded-full border-2 ${
              dragging.canDrop ? "border-amber-300 shadow-lg" : "border-black/60"
            }`}
            style={{
              width: 22,
              height: 22,
              backgroundColor: dragging.color,
              opacity: dragging.canDrop ? 1 : 0.7,
            }}
          />
          {dragging.overVolatile ? (
            <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-700/90 text-white text-[10px] font-semibold whitespace-nowrap shadow">
              ⚠ Volatile — triggers a Headline
            </div>
          ) : null}
        </div>
      ) : null}

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
