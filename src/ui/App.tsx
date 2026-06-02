// Root component. Reads phase from the zustand store and renders the right
// screen. If no game exists, shows Setup (the store handles persistence
// rehydration via `persist` middleware).
import { useGameStore } from "@/store/gameStore";
import Setup from "./screens/Setup";
import Handoff from "./screens/Handoff";
import Game from "./screens/Game";
import EndGame from "./screens/EndGame";

export default function App() {
  const state = useGameStore((s) => s.state);
  if (!state) return <Setup />;
  switch (state.phase) {
    case "setup":
      return <Setup />;
    case "handoff":
      return <Handoff />;
    case "ideology":
    case "actions":
    case "headlines":
      return <Game />;
    case "ended":
      return <EndGame />;
    default: {
      // Exhaustiveness check — should never happen.
      const _exhaust: never = state.phase;
      void _exhaust;
      return <Setup />;
    }
  }
}
