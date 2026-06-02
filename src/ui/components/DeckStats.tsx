// All four deck-pile stats — voter, ideology, conspiracy, headline —
// rendered as a compact inline strip. Hosted by the ActionBar on the
// right-hand side of the bottom bar.
import type { GameState } from "@/engine/types";
import { conspiracyPrice } from "@/engine/selectors";

interface Props {
  state: GameState;
  onBuyConspiracy?: () => void;
  buyConspiracyDisabled?: boolean;
}

export default function DeckStats({
  state,
  onBuyConspiracy,
  buyConspiracyDisabled,
}: Props) {
  const price = conspiracyPrice(state);
  return (
    <div
      className="flex items-stretch gap-1"
      role="region"
      aria-label="Deck piles"
    >
      <Stat
        label="Voter"
        n={state.decks.voter.length}
        discard={state.decks.voterDiscard.length}
      />
      <Stat
        label="Ideology"
        n={state.decks.ideology.length}
        discard={state.decks.ideologyDiscard.length}
      />
      <Stat
        label="Conspiracy"
        n={state.decks.conspiracy.length}
        discard={state.decks.conspiracyDiscard.length}
        price={price}
        onAction={onBuyConspiracy}
        actionLabel="Buy"
        actionDisabled={buyConspiracyDisabled}
      />
      <Stat
        label="Headline"
        n={state.decks.headline.length}
        discard={state.decks.headlineDiscard.length}
      />
    </div>
  );
}

function Stat({
  label,
  n,
  discard,
  price,
  onAction,
  actionLabel,
  actionDisabled,
}: {
  label: string;
  n: number;
  discard: number;
  price?: number | null;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
}) {
  return (
    <div className="bg-neutral-800/70 border border-neutral-700 rounded px-2 py-1 min-w-[78px]">
      <div className="font-semibold text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="text-sm font-bold leading-tight">
        {n}{" "}
        <span className="text-neutral-500 font-normal text-[10px]">
          / {discard}
        </span>
      </div>
      {price != null ? (
        <div className="text-[10px] text-amber-300 leading-tight">
          {price} <span className="text-neutral-500">any</span>
        </div>
      ) : null}
      {onAction ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="text-[10px] text-blue-300 hover:text-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
