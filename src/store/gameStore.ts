// Zustand store for SHASN. Holds the entire GameState and exposes dispatch
// through the engine reducer. Persisted to localStorage with a versioned
// schema so a future state shape change doesn't brick saves.
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { Action, GameState } from "@/engine/types";
import { createInitialState } from "@/engine/state";
// NOTE: the reducer is implemented in parallel by another agent. If this
// import fails at typecheck time, that's expected — integration will reconcile.
import { applyAction } from "@/engine/reducer";

interface GameStore {
  state: GameState | null;
  lastError: string | null;
  dispatch: (action: Action) => void;
  newGame: (args: {
    players: { name: string; color: GameState["players"][number]["color"] }[];
    seed?: number;
    removeSensitive?: boolean;
  }) => void;
  resume: () => boolean;
  clear: () => void;
  clearError: () => void;
}

const STORAGE_KEY = "shashn-online:game";

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: null,
      lastError: null,
      dispatch: (action: Action) => {
        const current = get().state;
        if (!current) {
          set({ lastError: "No active game" });
          return;
        }
        const result = applyAction(current, action);
        if (result.ok) {
          set({ state: result.state, lastError: null });
        } else {
          set({ lastError: result.error });
        }
      },
      newGame: (args) => {
        const state = createInitialState(args);
        set({ state, lastError: null });
      },
      resume: () => {
        // The persist middleware rehydrates `state` automatically. This helper
        // simply reports whether there is a game to resume.
        return get().state !== null;
      },
      clear: () => {
        set({ state: null, lastError: null });
      },
      clearError: () => set({ lastError: null }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // v2: GameState gained a per-game `board` (generated region map). Saves
      // from v1 have no board and would crash the renderer, so drop them.
      version: 2,
      partialize: (s) => ({ state: s.state }),
      migrate: (persisted, version) => {
        if (version < 2) {
          // Pre-board saves are unrenderable — discard rather than migrate.
          return { state: null };
        }
        return persisted as { state: GameState | null };
      },
    },
  ),
);

export function hasSavedGame(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.state?.state != null;
  } catch {
    return false;
  }
}
