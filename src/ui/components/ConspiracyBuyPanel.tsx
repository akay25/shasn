// Small sidebar panel: Buy the top conspiracy card. Pile counts are no
// longer shown here — they live in <DeckStats> on the bottom bar. The
// only state surfaced here is the current price and the Buy action.
import type { GameState } from "@/engine/types";
import { conspiracyPrice } from "@/engine/selectors";

interface Props {
  state: GameState;
  onBuyConspiracy?: () => void;
  disabled?: boolean;
}

export default function ConspiracyBuyPanel({
  state,
  onBuyConspiracy,
  disabled,
}: Props) {
  const price = conspiracyPrice(state);
  const noDeck = state.decks.conspiracy.length === 0;
  return (
    <div className="bg-neutral-900/60 border border-neutral-700 rounded-lg p-3 flex items-center justify-between gap-2">
      <div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-400">
          Conspiracy
        </div>
        <div className="text-sm font-semibold">
          {noDeck ? (
            <span className="text-neutral-500">Deck empty</span>
          ) : price != null ? (
            <>
              <span className="text-amber-300">{price}</span>{" "}
              <span className="text-[10px] text-neutral-500 font-normal">
                any resource
              </span>
            </>
          ) : (
            <span className="text-neutral-500">—</span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onBuyConspiracy}
        disabled={disabled || noDeck}
        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white"
      >
        Buy
      </button>
    </div>
  );
}
