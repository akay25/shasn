// Final scores, winner banner, "Play Again".
import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import {
  finalScores,
  totalVotersForPlayer,
} from "@/engine/selectors";
import PlayerColorSwatch, { PLAYER_COLOR_TEXT } from "@/ui/components/PlayerColorSwatch";

export default function EndGame() {
  const state = useGameStore((s) => s.state)!;
  const clear = useGameStore((s) => s.clear);

  const ranked = useMemo(() => {
    const scores = finalScores(state);
    return [...state.players]
      .map((p) => ({
        ...p,
        score: scores[p.id] ?? 0,
        total: totalVotersForPlayer(state, p.id),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.total - a.total;
      });
  }, [state]);

  const winner = ranked[0];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6 flex flex-col items-center">
      <div className="text-sm uppercase tracking-widest text-neutral-400 mb-2">
        Game over
      </div>
      <div className="text-5xl font-extrabold mb-2 flex items-center gap-3">
        <PlayerColorSwatch color={winner.color} size="xl" />
        <span className={PLAYER_COLOR_TEXT[winner.color]}>{winner.name}</span>
        <span className="text-neutral-100">wins</span>
      </div>
      <div className="text-neutral-400 mb-8">
        {winner.score} majority voter{winner.score === 1 ? "" : "s"}
      </div>

      <div className="w-full max-w-xl bg-neutral-900 border border-neutral-700 rounded-lg p-4">
        <div className="text-xs uppercase text-neutral-400 mb-2">Final scores</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-neutral-400">
              <th className="py-1">Rank</th>
              <th>Player</th>
              <th className="text-right">Majority voters</th>
              <th className="text-right">Total on board</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} className="border-t border-neutral-800">
                <td className="py-1">{i + 1}</td>
                <td className="flex items-center gap-2 py-1">
                  <PlayerColorSwatch color={p.color} size="sm" />
                  <span className={PLAYER_COLOR_TEXT[p.color]}>{p.name}</span>
                </td>
                <td className="text-right tabular-nums">{p.score}</td>
                <td className="text-right tabular-nums">{p.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => clear()}
        className="mt-6 px-6 py-3 rounded-lg bg-blue-700 hover:bg-blue-600 font-semibold focus:outline-none focus:ring-2 focus:ring-white"
      >
        Play again
      </button>
    </div>
  );
}
