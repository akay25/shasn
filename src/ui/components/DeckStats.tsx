// All four deck-pile stats — voter, ideology, conspiracy, headline —
// rendered as a compact floating HUD that overlays the bottom-right of the
// map canvas. Counts only on the tile; hovering each tile reveals a
// screen-edge-aware popover showing what's left (draw size, discard
// breakdown / names) so the active player can plan turn actions. The
// Rules link to the bundled rulebook PDF sits at the end of the strip.
// The Conspiracy Buy button lives in the sidebar (see <ConspiracyBuyPanel>).
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GameState } from "@/engine/types";
import { VOTER_CARDS } from "@/data/cards/voter";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";
import { HEADLINE_CARDS } from "@/data/cards/headline";
import { useEdgeAwarePopover } from "@/ui/hooks/useEdgeAwarePopover";
import rulebookUrl from "@/assets/rulebook.pdf";

interface Props {
  state: GameState;
}

export default function DeckStats({ state }: Props) {
  return (
    <div
      className="flex items-stretch gap-1 rounded-lg border border-neutral-700 bg-neutral-900/85 px-1.5 py-1.5 shadow-xl backdrop-blur"
      role="region"
      aria-label="Deck piles"
    >
      <Stat
        label="Voter"
        n={state.decks.voter.length}
        discard={state.decks.voterDiscard.length}
        details={<VoterDetails state={state} />}
      />
      <Stat
        label="Ideology"
        n={state.decks.ideology.length}
        discard={state.decks.ideologyDiscard.length}
        details={<IdeologyDetails state={state} />}
      />
      <Stat
        label="Conspiracy"
        n={state.decks.conspiracy.length}
        discard={state.decks.conspiracyDiscard.length}
        details={
          <NamedDiscardDetails
            drawCount={state.decks.conspiracy.length}
            discard={state.decks.conspiracyDiscard}
            lookup={(id) => CONSPIRACY_CARDS.find((c) => c.id === id)?.name ?? id}
            heading="Discarded"
            emptyLabel="No conspiracies played yet."
          />
        }
      />
      <Stat
        label="Headline"
        n={state.decks.headline.length}
        discard={state.decks.headlineDiscard.length}
        details={
          <NamedDiscardDetails
            drawCount={state.decks.headline.length}
            discard={state.decks.headlineDiscard}
            lookup={(id) => HEADLINE_CARDS.find((c) => c.id === id)?.name ?? id}
            heading="Resolved"
            emptyLabel="No headlines resolved yet."
          />
        }
      />

      {/* Rules — at the end of the strip. Opens the bundled rulebook PDF
          in a new tab. */}
      <a
        href={rulebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Open the SHASN rulebook (PDF)"
        aria-label="Open the SHASN rulebook (PDF) in a new tab"
        className="group flex flex-col items-stretch justify-between rounded border border-neutral-700 bg-neutral-800/70 px-2 py-1 min-w-[68px] hover:bg-neutral-700 transition focus:outline-none focus:ring-2 focus:ring-white"
      >
        <div className="font-semibold text-[10px] uppercase tracking-wide text-neutral-400 group-hover:text-neutral-200">
          Rules
        </div>
        <div className="flex items-center gap-1 text-sm font-bold leading-tight">
          <span
            aria-hidden
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-600 bg-neutral-900 text-[10px]"
          >
            ?
          </span>
          <span className="text-[10px] text-neutral-500 font-normal">PDF</span>
        </div>
      </a>
    </div>
  );
}

function Stat({
  label,
  n,
  discard,
  details,
}: {
  label: string;
  n: number;
  discard: number;
  details?: ReactNode;
}) {
  const { triggerRef, popRef, open, setOpen, pos } =
    useEdgeAwarePopover<HTMLDivElement>({ preferredSide: "top" });

  return (
    <div
      ref={triggerRef}
      className="relative bg-neutral-800/70 border border-neutral-700 rounded px-2 py-1 min-w-[68px]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={details ? 0 : undefined}
    >
      <div className="font-semibold text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="text-sm font-bold leading-tight">
        {n}{" "}
        <span className="text-neutral-500 font-normal text-[10px]">
          / {discard}
        </span>
      </div>
      {details && open
        ? // The DeckStats container uses backdrop-filter, which creates a
          // containing block for position:fixed descendants — that's why we
          // portal the popover to document.body, so the fixed coords land in
          // viewport space and the tooltip isn't clipped by the strip.
          createPortal(
            <div
              ref={popRef}
              role="tooltip"
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                zIndex: 50,
              }}
              className="pointer-events-none rounded-md border border-neutral-700 bg-neutral-900/95 px-3 py-2 shadow-xl text-left min-w-[180px] max-w-[260px]"
            >
              <div className="text-[9px] uppercase tracking-widest text-neutral-400 mb-1">
                {label} deck
              </div>
              {details}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// ---------- Per-deck detail blocks ----------------------------------------

function VoterDetails({ state }: { state: GameState }) {
  const buckets = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
  for (const id of state.decks.voterDiscard) {
    const c = VOTER_CARDS.find((v) => v.id === id);
    if (c) buckets[c.voters]++;
  }
  const totalDisc = state.decks.voterDiscard.length;
  return (
    <div className="space-y-1">
      <Row label="Draw" value={state.decks.voter.length} />
      <Row label="Discard" value={totalDisc} />
      <div className="border-t border-neutral-700/60 pt-1">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
          Discarded composition
        </div>
        {totalDisc === 0 ? (
          <div className="text-[11px] text-neutral-500">No discards yet.</div>
        ) : (
          <ul className="text-[11px] text-neutral-100 space-y-0.5">
            {([1, 2, 3] as const).map((k) =>
              buckets[k] > 0 ? (
                <li key={k}>
                  <span className="tabular-nums font-semibold">
                    {buckets[k]}
                  </span>{" "}
                  × {k}-voter card
                </li>
              ) : null,
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

function IdeologyDetails({ state }: { state: GameState }) {
  return (
    <div className="space-y-1">
      <Row label="Draw" value={state.decks.ideology.length} />
      <Row label="Discarded (redrawn)" value={state.decks.ideologyDiscard.length} />
      <div className="border-t border-neutral-700/60 pt-1 text-[10px] text-neutral-400 leading-snug">
        Chosen ideology cards live face-up under each player&apos;s row.
      </div>
    </div>
  );
}

function NamedDiscardDetails({
  drawCount,
  discard,
  lookup,
  heading,
  emptyLabel,
}: {
  drawCount: number;
  discard: string[];
  lookup: (id: string) => string;
  heading: string;
  emptyLabel: string;
}) {
  const recent = discard.slice(-8).reverse();
  return (
    <div className="space-y-1">
      <Row label="Draw" value={drawCount} />
      <Row label="Discard" value={discard.length} />
      <div className="border-t border-neutral-700/60 pt-1">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-0.5">
          {heading}
        </div>
        {discard.length === 0 ? (
          <div className="text-[11px] text-neutral-500">{emptyLabel}</div>
        ) : (
          <>
            <ul className="text-[11px] text-neutral-100 space-y-0.5">
              {recent.map((id, i) => (
                <li key={`${id}-${i}`} className="truncate">
                  · {lookup(id)}
                </li>
              ))}
            </ul>
            {discard.length > recent.length ? (
              <div className="mt-0.5 text-[10px] text-neutral-500">
                + {discard.length - recent.length} earlier
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-neutral-400">{label}</span>
      <span className="font-bold tabular-nums text-neutral-100">{value}</span>
    </div>
  );
}
