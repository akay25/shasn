// HQ Mat: three face-up voter cards + deck counts (voter, conspiracy, headline, ideology).
import type { GameState } from "@/engine/types";
import { VOTER_CARDS } from "@/data/cards/voter";
import VoterCardTile from "./VoterCardTile";

interface Props {
  state: GameState;
  onInfluenceClick?: (openIdx: 0 | 1 | 2) => void;
  onBuyConspiracy?: () => void;
  buyConspiracyDisabled?: boolean;
}

export default function HqMat({
  state,
  onInfluenceClick,
  onBuyConspiracy,
  buyConspiracyDisabled,
}: Props) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-700 rounded-lg p-3 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-neutral-400">HQ Mat</div>
      <div className="grid grid-cols-3 gap-2">
        {(state.openVoterCards as (string | null)[]).map((id, idx) => {
          const card = id ? VOTER_CARDS.find((c) => c.id === id) ?? null : null;
          return (
            <VoterCardTile
              key={idx}
              card={card}
              label={id ?? undefined}
              onClick={
                onInfluenceClick ? () => onInfluenceClick(idx as 0 | 1 | 2) : undefined
              }
              disabled={!card}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-2 text-[11px] text-neutral-300">
        <DeckBadge label="Voter" n={state.decks.voter.length} discard={state.decks.voterDiscard.length} />
        <DeckBadge
          label="Conspiracy"
          n={state.decks.conspiracy.length}
          discard={state.decks.conspiracyDiscard.length}
          onClick={onBuyConspiracy}
          actionLabel="Buy"
          actionDisabled={buyConspiracyDisabled}
        />
        <DeckBadge label="Headline" n={state.decks.headline.length} discard={state.decks.headlineDiscard.length} />
        <DeckBadge label="Ideology" n={state.decks.ideology.length} discard={state.decks.ideologyDiscard.length} />
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
        {n} <span className="text-neutral-500 font-normal text-[10px]">/ {discard} disc</span>
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
