// Full-screen, high-contrast interstitial: "Pass the device to {nextPlayer.name}."
// Used to hide previous player's hidden info (conspiracy hand, drawn ideology
// card) between turns.
import { useGameStore } from "@/store/gameStore";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer } from "@/engine/selectors";
import PlayerColorSwatch, { PLAYER_COLOR_HEX } from "@/ui/components/PlayerColorSwatch";

export default function Handoff() {
  const state = useGameStore((s) => s.state)!;
  const dispatch = useDispatch();
  const next = activePlayer(state);

  // Find the player to the next player's right — per rulebook they read the
  // ideology card aloud. With clockwise turn order and pass-to-the-right
  // reading, that's the player after `next` in the array.
  const rightIdx = (state.activePlayerIdx + 1) % state.players.length;
  const right = state.players[rightIdx];

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center p-8 text-center">
      <PlayerColorSwatch color={next.color} size="xxl" className="mb-6 shadow-xl" />
      <div className="text-sm uppercase tracking-widest text-neutral-400 mb-2">
        Pass the device to
      </div>
      <div
        className="text-6xl font-extrabold mb-6"
        style={{ color: PLAYER_COLOR_HEX[next.color] }}
      >
        {next.name}
      </div>
      <div className="max-w-lg text-neutral-300 mb-8">
        <span className="font-semibold text-white">{right.name}</span> (the
        player to {next.name}'s right) will read the next Ideology Card aloud.
        When ready, {next.name} should tap below.
      </div>
      <button
        type="button"
        onClick={() => dispatch({ t: "acknowledgeHandoff" })}
        className="px-8 py-4 rounded-lg bg-white text-black font-bold text-lg hover:bg-neutral-200 focus:outline-none focus:ring-4 focus:ring-white/50"
      >
        I'm {next.name} — start my turn
      </button>
      <div className="mt-8 text-xs text-neutral-500">
        Turn {state.turn} · Player {state.activePlayerIdx + 1} of {state.players.length}
      </div>
    </div>
  );
}
