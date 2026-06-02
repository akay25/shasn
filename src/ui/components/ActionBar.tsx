// Bottom action bar. Buttons open modals or dispatch end-turn.
// Note: Influence is triggered by clicking a voter card on the HQ Mat (which
// lets the player pick which card), so there is no Influence button here.
interface Props {
  onGerrymander: () => void;
  onTrade: () => void;
  onPlayConspiracy: () => void;
  onBuyConspiracy: () => void;
  onEndTurn: () => void;
  canEndTurn: boolean;
  canPlayConspiracy: boolean;
  canBuyConspiracy: boolean;
  inActionsPhase: boolean;
}

export default function ActionBar({
  onGerrymander,
  onTrade,
  onPlayConspiracy,
  onBuyConspiracy,
  onEndTurn,
  canEndTurn,
  canPlayConspiracy,
  canBuyConspiracy,
  inActionsPhase,
}: Props) {
  const btn =
    "px-3 py-2 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border-t border-neutral-800 bg-neutral-950">
      <button type="button" onClick={onGerrymander} disabled={!inActionsPhase} className={btn}>
        Gerrymander
      </button>
      <button type="button" onClick={onTrade} disabled={!inActionsPhase} className={btn}>
        Trade
      </button>
      <button type="button" onClick={onBuyConspiracy} disabled={!canBuyConspiracy || !inActionsPhase} className={btn}>
        Buy Conspiracy
      </button>
      <button type="button" onClick={onPlayConspiracy} disabled={!canPlayConspiracy} className={btn}>
        Play Conspiracy
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={onEndTurn}
        disabled={!canEndTurn}
        className="px-4 py-2 rounded-md bg-blue-700 hover:bg-blue-600 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white text-sm font-semibold"
      >
        End Turn
      </button>
    </div>
  );
}
