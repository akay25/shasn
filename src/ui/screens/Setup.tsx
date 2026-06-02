// Setup screen: 2–5 players, names, player-colour picker, sensitive toggle.
// The colour a player picks here becomes their voter-peg colour on the board.
// It is purely visual — Ideologue powers attach to ideology cards, not to
// the player's colour pick.
import { useState } from "react";
import type { PlayerColor } from "@/engine/types";
import { PLAYER_COLORS } from "@/engine/types";
import { useGameStore } from "@/store/gameStore";
import PlayerColorSwatch, { PLAYER_COLOR_LABEL } from "@/ui/components/PlayerColorSwatch";

interface PlayerDraft {
  name: string;
  color: PlayerColor;
}

const DEFAULT_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"];
const DEFAULT_COLORS: PlayerColor[] = ["red", "blue", "yellow", "green", "purple"];

function makeDefaults(n: number): PlayerDraft[] {
  return new Array(n).fill(null).map((_, i) => ({
    name: DEFAULT_NAMES[i] ?? `Player ${i + 1}`,
    color: DEFAULT_COLORS[i] ?? "pink",
  }));
}

export default function Setup() {
  const newGame = useGameStore((s) => s.newGame);
  const [count, setCount] = useState(3);
  const [players, setPlayers] = useState<PlayerDraft[]>(makeDefaults(3));
  const [removeSensitive, setRemoveSensitive] = useState(false);

  const setCountAndAdjust = (n: number) => {
    setCount(n);
    setPlayers((prev) => {
      const out = makeDefaults(n);
      for (let i = 0; i < Math.min(prev.length, n); i++) out[i] = prev[i];
      return out;
    });
  };

  const start = () => {
    newGame({
      players: players.map((p) => ({
        name: p.name.trim() || "Player",
        color: p.color,
      })),
      removeSensitive,
    });
  };

  // Highlight collisions: two players can't share the same colour.
  const colorCounts = players.reduce<Record<string, number>>((acc, p) => {
    acc[p.color] = (acc[p.color] ?? 0) + 1;
    return acc;
  }, {});
  const hasCollision = Object.values(colorCounts).some((n) => n > 1);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-1">SHASN Online</h1>
      <div className="text-neutral-400 mb-6">Pass-and-play setup</div>

      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-700 rounded-lg p-4 space-y-4">
        <div>
          <div className="text-sm text-neutral-300 mb-1">Number of players</div>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setCountAndAdjust(n)}
                className={`px-3 py-1 rounded border ${
                  n === count
                    ? "border-white bg-neutral-800"
                    : "border-neutral-700 hover:bg-neutral-800"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {players.map((p, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-neutral-800/60 border border-neutral-700 rounded p-2"
            >
              <div className="text-xs text-neutral-400 w-6">P{i + 1}</div>
              <input
                type="text"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-sm"
                value={p.name}
                onChange={(e) =>
                  setPlayers((prev) => {
                    const out = [...prev];
                    out[i] = { ...out[i], name: e.target.value };
                    return out;
                  })
                }
                placeholder={DEFAULT_NAMES[i]}
              />
              <div className="flex gap-1">
                {PLAYER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() =>
                      setPlayers((prev) => {
                        const out = [...prev];
                        out[i] = { ...out[i], color: c };
                        return out;
                      })
                    }
                    title={PLAYER_COLOR_LABEL[c]}
                    className={`rounded-full p-0.5 transition ${
                      p.color === c
                        ? "ring-2 ring-white"
                        : "opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`${p.name} colour ${PLAYER_COLOR_LABEL[c]}`}
                  >
                    <PlayerColorSwatch color={c} size="md" ring={false} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {hasCollision ? (
          <div className="text-xs text-amber-300 bg-amber-700/20 border border-amber-700/40 rounded px-2 py-1">
            Two players share the same colour — give each player a different
            colour before starting.
          </div>
        ) : null}

        <label className="flex items-center gap-2 text-sm text-neutral-300">
          <input
            type="checkbox"
            checked={removeSensitive}
            onChange={(e) => setRemoveSensitive(e.target.checked)}
          />
          Remove sensitive ideology cards (Content Advisory)
        </label>

        <div className="text-xs text-neutral-500">
          Everyone starts with zero resources. Your colour is just a visual
          theme — voter pegs on the board will be in your chosen colour.
        </div>

        <button
          type="button"
          onClick={start}
          disabled={hasCollision}
          className="w-full px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed font-semibold focus:outline-none focus:ring-2 focus:ring-white"
        >
          Start game
        </button>
      </div>
    </div>
  );
}
