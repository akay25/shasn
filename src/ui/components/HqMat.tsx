// HQ Mat: the three face-up voter cards only. Deck-pile counts (voter,
// ideology, conspiracy, headline) now live in <DeckStats>, a single
// widget pinned to the bottom-right of the page.
import type { GameState } from "@/engine/types";
import { VOTER_CARDS } from "@/data/cards/voter";
import VoterCardTile from "./VoterCardTile";

interface Props {
  state: GameState;
  onInfluenceClick?: (openIdx: 0 | 1 | 2) => void;
}

export default function HqMat({ state, onInfluenceClick }: Props) {
  return (
    <div className="bg-neutral-900/60 border border-neutral-700 rounded-lg p-3 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-neutral-400">Voters deck</div>
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
    </div>
  );
}
