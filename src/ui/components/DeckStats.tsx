// All four deck-pile stats — voter, ideology, conspiracy, headline —
// rendered as a compact inline strip. Counts only, no actions. The
// Conspiracy Buy button lives in the sidebar (see <ConspiracyBuyPanel>).
import type { GameState } from "@/engine/types";

interface Props {
  state: GameState;
}

export default function DeckStats({ state }: Props) {
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
}: {
  label: string;
  n: number;
  discard: number;
}) {
  return (
    <div className="bg-neutral-800/70 border border-neutral-700 rounded px-2 py-1 min-w-[68px]">
      <div className="font-semibold text-[10px] uppercase tracking-wide text-neutral-400">
        {label}
      </div>
      <div className="text-sm font-bold leading-tight">
        {n}{" "}
        <span className="text-neutral-500 font-normal text-[10px]">
          / {discard}
        </span>
      </div>
    </div>
  );
}
