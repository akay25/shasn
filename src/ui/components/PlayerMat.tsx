// The active player's full mat: name, color, resources, cap, ideology cards
// grouped by ideologue with progress bars to L3/L5, conspiracy hand, unlocked powers.
import type { Player } from "@/engine/types";
import { IDEOLOGUES, IDEOLOGUE_RESOURCE } from "@/engine/types";
import {
  ideologueCardCount,
  passiveResourcesFor,
  powerUnlocked,
} from "@/engine/selectors";
import ResourceTrack from "./ResourceTrack";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";

interface Props {
  player: Player;
  onPlayConspiracy?: (cardId: string) => void;
  onUsePower?: (ideologue: typeof IDEOLOGUES[number], level: 3 | 5) => void;
}

const COLOR_BG: Record<string, string> = {
  capitalist: "bg-capitalist",
  supremo: "bg-supremo",
  showstopper: "bg-showstopper",
  idealist: "bg-idealist",
};
const COLOR_TEXT: Record<string, string> = {
  capitalist: "text-capitalist",
  supremo: "text-supremo",
  showstopper: "text-showstopper",
  idealist: "text-idealist",
};

const IDEOLOGUE_LABEL: Record<string, string> = {
  capitalist: "Capitalist",
  supremo: "Supremo",
  showstopper: "Showstopper",
  idealist: "Idealist",
};

export default function PlayerMat({ player, onPlayConspiracy, onUsePower }: Props) {
  const passive = passiveResourcesFor(player);

  return (
    <div className="flex flex-col gap-3 bg-neutral-900/70 border border-neutral-700 rounded-lg p-3 min-w-[260px]">
      <div className="flex items-center gap-2">
        <div className={`w-4 h-4 rounded-full ${COLOR_BG[player.color]}`} />
        <div className="font-bold text-lg">{player.name}</div>
        <div className={`text-xs uppercase ${COLOR_TEXT[player.color]}`}>
          {IDEOLOGUE_LABEL[player.color]}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Resources</div>
        <ResourceTrack resources={player.resources} cap={player.resourceCap} />
        {Object.keys(passive).length > 0 ? (
          <div className="text-[10px] text-neutral-400 mt-1">
            Passive bonus on next ideology turn:{" "}
            {Object.entries(passive)
              .map(([r, n]) => `+${n} ${r}`)
              .join(", ")}
          </div>
        ) : null}
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
          Ideology Cards
        </div>
        <div className="flex flex-col gap-1">
          {IDEOLOGUES.map((ig) => {
            const n = ideologueCardCount(player, ig);
            const pct = Math.min(100, (n / 5) * 100);
            const l3 = powerUnlocked(player, ig, 3);
            const l5 = powerUnlocked(player, ig, 5);
            return (
              <div key={ig} className="flex items-center gap-2 text-xs">
                <div className={`w-2 h-2 rounded-full ${COLOR_BG[ig]}`} />
                <div className="w-20 truncate">{IDEOLOGUE_LABEL[ig]}</div>
                <div className="flex-1 h-2 bg-neutral-800 rounded relative overflow-hidden">
                  <div
                    className={`h-full ${COLOR_BG[ig]}`}
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
        <div className="text-[10px] text-neutral-500 mt-1">
          Resource mapping: cap → funds, sup → clout, sho → media, ide → trust.
          Each pair gives +1 of its resource on ideology turn.
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">
          Conspiracy Hand ({player.conspiracyHand.length})
        </div>
        {player.conspiracyHand.length === 0 ? (
          <div className="text-xs text-neutral-500">No conspiracy cards.</div>
        ) : (
          <ul className="space-y-1">
            {player.conspiracyHand.map((id, i) => {
              const card = CONSPIRACY_CARDS.find((c) => c.id === id);
              return (
                <li
                  key={`${id}-${i}`}
                  className="flex items-center justify-between gap-2 bg-neutral-800/60 border border-neutral-700 rounded px-2 py-1 text-xs"
                >
                  <div className="flex-1 truncate">
                    <span className="font-semibold">{card?.name ?? id}</span>
                    {card?.description ? (
                      <span className="text-neutral-400">
                        {" "}
                        — {card.description}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayConspiracy?.(id)}
                    className="text-[10px] px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40"
                    disabled={!onPlayConspiracy}
                  >
                    Play
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// Resource mapping helper (display only).
export const IDEOLOGUE_RESOURCE_DISPLAY = IDEOLOGUE_RESOURCE;
