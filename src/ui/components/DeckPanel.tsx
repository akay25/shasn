// Conspiracy and Headline deck pile indicators, lifted out of HqMat so they
// can sit on the left column under the ideology-collection panel. The
// conspiracy badge is clickable (Buy top of deck); headlines are drawn by
// the engine, never by the player, so their badge is informational only.
import type { GameState } from "@/engine/types";

interface Props {
  state: GameState;
  onBuyConspiracy?: () => void;
  buyConspiracyDisabled?: boolean;
}

export default function DeckPanel({
  state,
  onBuyConspiracy,
  buyConspiracyDisabled,
}: Props) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-700 rounded-lg p-3 flex flex-col gap-2">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">
        Decks
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-300">
        <DeckBadge
          label="Conspiracy"
          n={state.decks.conspiracy.length}
          discard={state.decks.conspiracyDiscard.length}
          onClick={onBuyConspiracy}
          actionLabel="Buy"
          actionDisabled={buyConspiracyDisabled}
        />
        <DeckBadge
          label="Headline"
          n={state.decks.headline.length}
          discard={state.decks.headlineDiscard.length}
        />
      </div>
    </div>
  );
}

function DeckBadge({
  label,
  n,
  discard,
  onClick,
  actionLabel,
  actionDisabled,
}: {
  label: string;
  n: number;
  discard: number;
  onClick?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
}) {
  return (
    <div className="bg-neutral-800/70 border border-neutral-700 rounded px-2 py-1">
      <div className="font-semibold text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="text-sm font-bold">
        {n}{" "}
        <span className="text-neutral-500 font-normal text-[10px]">
          / {discard} disc
        </span>
      </div>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={actionDisabled}
          className="text-[10px] text-blue-300 hover:text-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
