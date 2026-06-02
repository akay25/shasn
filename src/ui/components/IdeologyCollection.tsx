// The active player's collected Ideology Cards, grouped by Ideologue with
// progress bars and L3/L5 power buttons. Extracted from PlayerMat so it can
// live in its own panel on the left column of the game screen.
import type { Player } from "@/engine/types";
import { IDEOLOGUES } from "@/engine/types";
import {
  ideologueCardCount,
  passiveResourcesFor,
  powerUnlocked,
} from "@/engine/selectors";
import Coin, { IDEOLOGUE_LABEL } from "./Coin";

interface Props {
  player: Player;
  onUsePower?: (ideologue: typeof IDEOLOGUES[number], level: 3 | 5) => void;
}

// Progress-bar fills, per Ideologue.
const IDEO_BG: Record<string, string> = {
  capitalist: "bg-capitalist",
  supremo: "bg-supremo",
  showstopper: "bg-showstopper",
  idealist: "bg-idealist",
};

export default function IdeologyCollection({ player, onUsePower }: Props) {
  const passive = passiveResourcesFor(player);

  return (
    <div className="bg-neutral-900/70 border border-neutral-700 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
        Ideology Cards · {player.name}
      </div>
      <div className="flex flex-col gap-1">
        {IDEOLOGUES.map((ig) => {
          const n = ideologueCardCount(player, ig);
          const pct = Math.min(100, (n / 5) * 100);
          const l3 = powerUnlocked(player, ig, 3);
          const l5 = powerUnlocked(player, ig, 5);
          return (
            <div key={ig} className="flex items-center gap-2 text-xs">
              <Coin ideologue={ig} size="sm" />
              <div className="w-20 truncate">{IDEOLOGUE_LABEL[ig]}</div>
              <div className="flex-1 h-2 bg-neutral-800 rounded relative overflow-hidden">
                <div
                  className={`h-full ${IDEO_BG[ig]}`}
                  style={{ width: `${pct}%` }}
                />
                <div className="absolute top-0 left-[60%] w-px h-full bg-white/60" title="L3" />
                <div className="absolute top-0 left-[100%] w-px h-full bg-white/60" title="L5" />
              </div>
              <div className="w-6 text-right tabular-nums">{n}</div>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={!l3}
                  onClick={() => l3 && onUsePower?.(ig, 3)}
                  className="text-[10px] px-1 py-0.5 rounded border border-neutral-700 disabled:opacity-30 hover:bg-neutral-800"
                  title="Level 3 Power"
                >
                  L3
                </button>
                <button
                  type="button"
                  disabled={!l5}
                  onClick={() => l5 && onUsePower?.(ig, 5)}
                  className="text-[10px] px-1 py-0.5 rounded border border-neutral-700 disabled:opacity-30 hover:bg-neutral-800"
                  title="Level 5 Power"
                >
                  L5
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {Object.keys(passive).length > 0 ? (
        <div className="text-[10px] text-neutral-400 mt-2">
          Passive bonus on next ideology turn:{" "}
          {Object.entries(passive)
            .map(([r, n]) => `+${n} ${r}`)
            .join(", ")}
        </div>
      ) : null}
      <div className="text-[10px] text-neutral-500 mt-1">
        Each pair of cards in one ideologue grants +1 of that ideologue's
        resource on your ideology turn.
      </div>
    </div>
  );
}
