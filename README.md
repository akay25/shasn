# SHASN Online

A browser-based pass-and-play implementation of the board game **SHASN** (Memesys Lab). One device, two-to-five friends, hot-seat handoff between turns.

The full rulebook ships with the build — click the **Rules** tile in the bottom bar to open it.

---

## Tech stack

- **Vite + React 18 + TypeScript** — SPA, no backend.
- **Zustand** for game state, with a `persist` middleware that auto-saves to `localStorage` (resume on refresh).
- **Tailwind CSS v3** for styling. Custom theme pack "Oxblood Noir" (ink / oxblood / sand / stone) lives in `tailwind.config.ts`.
- **Vitest** for the engine + integration test suite.

No network, no auth, no accounts — everything runs locally.

---

## Prerequisites

- **Node.js** 18 or newer (developed against **v22**).
- **npm** 10+. `pnpm` and `yarn` work too if you prefer, but this README uses npm.

---

## First-time setup

```bash
git clone <this repo>
cd shashn-online
npm install
```

That's it. No `.env`, no database, no extra config.

---

## Running it

### Dev server (hot reload)

```bash
npm run dev
```

Open <http://localhost:5173>. Vite hot-reloads on save.

### Production build

```bash
npm run build
```

Outputs to `dist/`. The build runs `tsc -b` (project-wide typecheck) before `vite build`. Coin PNGs and the bundled `rulebook.pdf` are emitted under `dist/assets/` with hashed filenames.

### Preview the production build

```bash
npm run preview
```

Serves `dist/` on a local port for a final sanity check.

### Tests

```bash
npm test            # one-shot: engine + integration (~60 tests)
npm run test:watch  # vitest in watch mode
```

### Typecheck only

```bash
npm run typecheck
```

---

## How to play

1. **Setup screen** — pick 2–5 players, name each one, give each a unique player colour (the colour of that player's voter pegs on the map). The "Original map" toggle picks between the published board layout and a randomly carved one. "Remove sensitive cards" filters Content Advisory ideology cards.
2. **Handoff** — between turns, a full-screen "Pass the device to ___" interstitial hides the previous player's secrets.
3. **Ideology phase** — the player on the active player's right reads the prompt and both answer texts. The active player picks left or right *without* seeing which Ideologue (or reward) each side grants. Once chosen, the side is revealed and they confirm to bank the payout.
4. **Actions phase** — click voter cards on the HQ Mat to influence (Voter Card pegs land on the map by clicking valid hex slots). Use the bottom bar to Gerrymander / Trade / Play Conspiracy. The sidebar shows every player's summary, the active player's ideology card collection (accordion under their row), and a Buy Conspiracy panel.
5. **End Turn** — top-right button, beside the active player's name. Disabled until all pending placements are placed and you're at/below the resource cap.
6. **End game** — when every zone's majority is decided, the winner banner shows; "Play again" clears state and returns to Setup.

The sidebar is **resizable** — drag the divider, double-click to reset. Width is capped at 20% of viewport width and persists across reloads.

---

## Project layout

```
src/
  engine/           # Pure TS rules engine — no React
    types.ts        # GameState / Player / Action / Zone shapes (frozen contract)
    state.ts        # createInitialState — staggered starting resources
    reducer.ts      # applyAction(state, action) → ActionResult
    selectors.ts    # Derived helpers (active player, scores, etc.)
    rng.ts          # Seeded mulberry32 + Fisher–Yates shuffle
    board/
      generate.ts   # 129-cell horizontal-diamond substrate; original + dynamic layouts
    rules/
      ideology.ts, voterCards.ts, gerrymander.ts, majorities.ts,
      conspiracy.ts, headlines.ts, trade.ts, powers.ts, placement.ts, turn.ts
  data/
    board.ts        # Zone template (capacities + majority targets, no geometry)
    cards/          # Stubbed ideology / voter / conspiracy / headline decks
    ideologueInfo.ts# Tooltip text for the four Ideologues' passive + L3 + L5 powers
  store/
    gameStore.ts    # Zustand + persist (localStorage key "shashn-online:game")
  ui/
    screens/        # Setup, Handoff, Game, EndGame
    components/     # MapBoard (canvas), HqMat, PlayerSummary, IdeologyCollection,
                    # ConspiracyBuyPanel, DeckStats, ActionBar, modals, Coin, etc.
    hooks/          # useDispatch, useEdgeAwarePopover
  assets/
    coins/          # The four ideologue coin PNGs
    art/            # Conspiracy / headline illustrations
    rulebook.pdf    # Bundled and served as a Vite asset
  vite-env.d.ts     # /// <reference types="vite/client" /> — png/pdf import support

tests/
  engine/           # Unit tests per rule module (vitest)
  integration/      # End-to-end smoke flow

tailwind.config.ts  # "Oxblood Noir" theme pack + faction colours
vite.config.ts      # @/* path alias, vitest config
```

---

## Configuration knobs you might tweak

| What | Where |
| --- | --- |
| Starting resource amounts | `src/engine/state.ts` (`STARTING_RESOURCE_ORDER`, staggered loop) |
| Resource cap | `src/engine/state.ts` (`resourceCap: 12`) |
| Zone capacities / majority targets / volatile counts | `src/data/board.ts` (`BOARD.zones` / `ZONE_TEMPLATE`) |
| Card content | `src/data/cards/*.ts` — typed stubs, swap with real card data |
| Ideologue power text | `src/data/ideologueInfo.ts` |
| Player colour palette | `src/engine/types.ts` (`PlayerColor` union, `PLAYER_COLORS`) + `src/ui/components/PlayerColorSwatch.tsx` (`PLAYER_COLOR_HEX`) |
| Theme | `tailwind.config.ts` (`palette`, `neutral`, `blue`, `amber`) + `src/index.css` |
| Sidebar min / max / default width | `src/ui/screens/Game.tsx` (`SIDEBAR_MIN`, `SIDEBAR_MAX_FRACTION`, `SIDEBAR_DEFAULT`) |
| `localStorage` keys | `shashn-online:game` (game state), `shashn-online:sidebarWidth` (sidebar width) |

---

## Saved games

Game state auto-persists to `localStorage` under `shashn-online:game`. Refreshing the page resumes mid-turn. To start fresh, finish the game and use **Play again** (which calls `clear()`), or clear the key from devtools.

---

## Troubleshooting

- **Port 5173 in use** — pass `--port` to Vite: `npm run dev -- --port 5174`.
- **PDF won't open** — make sure `src/assets/rulebook.pdf` exists; the production build copies it to `dist/assets/rulebook-<hash>.pdf`.
- **Stale state after a code change** — clear the `shashn-online:game` key in localStorage. The store has a schema version, but breaking changes may still need a clear.
- **Slow first build** — Vite pre-bundles deps once on the first `dev` / `build`; subsequent runs are fast.
