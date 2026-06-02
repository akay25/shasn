// Small sidebar panel: Buy the top conspiracy card. Pile counts are no
// longer shown here — they live in <DeckStats> on the bottom bar. The
// only state surfaced here is the current price and the Buy action.
// Background uses the conspiracy.png illustration overlaid with a dark
// gradient so the text/button stay legible.
import type { GameState } from "@/engine/types";
import { conspiracyPrice } from "@/engine/selectors";
import conspiracyArt from "@/assets/art/conspiracy.png";

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
    <div
      // ISO/IEC 7810 ID-1 (credit card) is 85.60 x 53.98 mm — 1.586 : 1.
      className="relative w-full overflow-hidden border border-neutral-700 rounded-xl shadow-lg"
      style={{
        aspectRatio: "85.60 / 53.98",
        backgroundImage: `url(${conspiracyArt})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark gradient overlay so the text remains readable on the art. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(10,10,12,0.85) 0%, rgba(10,10,12,0.55) 55%, rgba(10,10,12,0.35) 100%)",
        }}
      />
      <div className="relative h-full p-3 flex flex-col justify-between">
        <div className="text-[10px] uppercase tracking-widest text-amber-100/80 drop-shadow">
          Conspiracy
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="text-sm font-semibold drop-shadow">
            {noDeck ? (
              <span className="text-neutral-300">Deck empty</span>
            ) : price != null ? (
              <>
                <span className="text-amber-300 text-xl leading-none">{price}</span>{" "}
                <span className="text-[10px] text-neutral-300 font-normal">
                  any resource
                </span>
              </>
            ) : (
              <span className="text-neutral-300">—</span>
            )}
          </div>
          <button
            type="button"
            onClick={onBuyConspiracy}
            disabled={disabled || noDeck}
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white shadow"
          >
            Buy
          </button>
        </div>
      </div>
    </div>
  );
}
