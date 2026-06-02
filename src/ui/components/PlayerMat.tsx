// Active player's mat: identity, resources + cap, and conspiracy hand. The
// per-Ideologue progress + L3/L5 power buttons have moved to
// <IdeologyCollection> on the left column.
import type { Player } from "@/engine/types";
import { IDEOLOGUE_RESOURCE } from "@/engine/types";
import ResourceTrack from "./ResourceTrack";
import PlayerColorSwatch, { PLAYER_COLOR_TEXT, PLAYER_COLOR_LABEL } from "./PlayerColorSwatch";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";

interface Props {
  player: Player;
  onPlayConspiracy?: (cardId: string) => void;
}

export default function PlayerMat({ player, onPlayConspiracy }: Props) {
  return (
    <div className="flex flex-col gap-3 bg-neutral-900/70 border border-neutral-700 rounded-lg p-3 min-w-[260px]">
      <div className="flex items-center gap-2">
        <PlayerColorSwatch color={player.color} size="lg" />
        <div className="font-bold text-lg">{player.name}</div>
        <div className={`text-xs uppercase ${PLAYER_COLOR_TEXT[player.color]}`}>
          {PLAYER_COLOR_LABEL[player.color]}
        </div>
      </div>

      <div>
        <div className="text-[10px] uppercase tracking-wide text-neutral-400 mb-1">Resources</div>
        <ResourceTrack resources={player.resources} cap={player.resourceCap} />
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
