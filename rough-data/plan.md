# SHASN Online — Plan

## Context

We are building a digital, browser-based version of **SHASN** (the 2019 political strategy board game by Zain Memon, Memesys Lab). The full rulebook (`rulebook.pdf`, 40 pages) has been read; this plan implements the **base game** described in pages 6–21 of that document.

**Goals & constraints (from user):**
- **Pass-and-play on a single computer** (hot-seat). Two to five friends share one device; the active player takes the screen for their turn, then hands it off.
- **Web only**, TypeScript + React.
- **ASAP / days** timeline — friends-only audience, no accounts, no networking, no scaling.
- **Base game only** for v1. No Elites, Home Turfs, Edge of Chaos, Cost of Victory, or the separate 2-player board mode (all are KS promos).
- **Stubbed card content** for v1 — the rulebook contains rules but no card text; we'll ship a small placeholder card set and a JSON schema so the real card text can be filled in later.
- **Auto-save to `localStorage`** so a game survives a refresh.
- **Hidden-info handoff:** between turns, a full-screen "Pass to Player X — tap when ready" interstitial hides the previous player's Conspiracy hand etc. Per the rulebook, the player *to the right* of the active player reads the Ideology Card aloud, so on the handoff screen we'll briefly reveal the next card to that player only.

The intended outcome is a playable v1 within a few days that a group of 3–5 friends can sit around a laptop and play end-to-end, with the rules engine accurate enough that filling in real card text later (no engine changes required) gives the full retail game.

---

## Tech Stack

- **Vite + React 18 + TypeScript** — fastest scaffold for a SPA.
- **Zustand** for state — small, no boilerplate, easy to wrap with a `persist` middleware that writes to `localStorage`. Single store holds the entire `GameState`.
- **Tailwind CSS** for styling — utility-first matches the speed goal; no design-system overhead.
- **Vitest** for engine unit tests.
- **No backend, no auth, no router** (one screen). No build/CI setup beyond `vite dev` / `vite build`.

---

## Architecture

The codebase splits into a **pure rules engine** (no React) and a **UI layer** that renders state and dispatches intents. The engine is the source of truth for legality, scoring, and turn flow; the UI is a thin view.

### Directory layout

```
shashn-online/
├── rulebook.pdf
├── package.json, vite.config.ts, tsconfig.json, tailwind.config.ts
├── index.html
├── src/
│   ├── engine/
│   │   ├── types.ts              # GameState, Player, Zone, Card, Action
│   │   ├── state.ts              # createInitialState(players, seed)
│   │   ├── reducer.ts            # applyAction(state, action) -> state
│   │   ├── selectors.ts          # gerrymanderingRights(state, zoneId), scores(state), etc.
│   │   └── rules/
│   │       ├── ideology.ts       # draw + answer card, grant resources, unlock powers
│   │       ├── voterCards.ts     # influence, place voters
│   │       ├── conspiracy.ts     # buy/play
│   │       ├── headlines.ts      # trigger from volatile-area placement
│   │       ├── gerrymander.ts    # move 1 non-majority voter per turn per zone
│   │       ├── majorities.ts     # form/break check after every voter change
│   │       ├── trade.ts          # resource + conspiracy card trades
│   │       ├── powers.ts         # passive/L3/L5 Ideologue powers
│   │       └── turn.ts           # start-of-turn, end-of-turn, end-game
│   ├── data/
│   │   ├── board.ts              # 9 zones, capacities, adjacency, volatile areas
│   │   └── cards/
│   │       ├── ideology.ts       # ~20 stub cards
│   │       ├── voter.ts          # ~10 stub cards
│   │       ├── conspiracy.ts     # ~5 stub cards w/ effect handlers
│   │       └── headline.ts       # ~5 stub cards w/ effect handlers
│   ├── store/
│   │   └── gameStore.ts          # zustand store + persist + dispatch wrapper
│   ├── ui/
│   │   ├── App.tsx
│   │   ├── screens/
│   │   │   ├── Setup.tsx         # player count, names, ideologue color choice
│   │   │   ├── Handoff.tsx       # "Pass to Player X" interstitial
│   │   │   ├── Game.tsx          # main play screen
│   │   │   └── EndGame.tsx       # final scores + winner
│   │   ├── components/
│   │   │   ├── Board.tsx, Zone.tsx, VoterSlot.tsx
│   │   │   ├── PlayerMat.tsx, ResourceTrack.tsx, IdeologueProgress.tsx
│   │   │   ├── HqMat.tsx, VoterCardRow.tsx, DeckIndicator.tsx
│   │   │   ├── IdeologyCardModal.tsx, ConspiracyCardModal.tsx, HeadlineCardModal.tsx
│   │   │   ├── TradeModal.tsx, ResourceDiscardModal.tsx
│   │   │   └── ActionBar.tsx     # influence / gerrymander / trade / play card / end turn
│   │   └── hooks/
│   │       └── useDispatch.ts
│   ├── main.tsx, index.css
└── tests/
    └── engine/                   # mirrors src/engine/ structure
```

### Core types (sketch)

```ts
type Resource = "funds" | "clout" | "media" | "trust";
type Ideologue = "capitalist" | "supremo" | "showstopper" | "idealist";
type PlayerId = string; // "p1".."p5"

interface Zone {
  id: string; // "nw","n","ne","w","c","e","sw","s","se"
  name: string;
  capacity: number;            // total voter slots
  majorityRequirement: number; // e.g. 6 of 11
  adjacent: string[];          // zone ids
  volatileSlotIndices: number[]; // which slot indices are volatile
}

interface VoterPlacement { playerId: PlayerId; isMajority: boolean; }
type Slot = VoterPlacement | null;

interface ZoneState {
  slots: Slot[];                  // length === capacity
  majorityHolder: PlayerId | null;
}

interface Player {
  id: PlayerId;
  name: string;
  color: Ideologue;               // chosen at setup
  resources: Record<Resource, number>;
  resourceCap: number;            // default 12
  ideologyCards: IdeologyCardChoice[]; // {cardId, side}
  conspiracyHand: string[];       // card ids
  iouOwed: number;                // for auction debt
}

interface GameState {
  phase: "setup" | "handoff" | "ideology" | "actions" | "headlines" | "ended";
  players: Player[];
  activePlayerIdx: number;
  zones: Record<string, ZoneState>;
  decks: {
    ideology: string[]; ideologyDiscard: string[];
    voter: string[]; voterDiscard: string[];
    conspiracy: string[]; conspiracyDiscard: string[];
    headline: string[]; headlineDiscard: string[];
  };
  openVoterCards: [string|null, string|null, string|null]; // 3 face-up
  pendingHeadlines: number;        // headlines to resolve at end of turn
  pendingVoterPlacements: VoterPlacement[]; // unplaced voters from this turn
  rngSeed: number;                 // for deterministic shuffles + replays
  log: GameEvent[];                // append-only history (powers UI + debugging)
}

type Action =
  | { t: "setupGame"; players: {name:string; color:Ideologue}[] }
  | { t: "answerIdeology"; side: "left"|"right" }
  | { t: "redrawIdeology" }                       // pay 4
  | { t: "influenceVoterCard"; openIdx: 0|1|2; payment: Partial<Record<Resource, number>> }
  | { t: "placeVoters"; placements: {zoneId:string; slotIdx:number}[] }
  | { t: "gerrymander"; fromZone: string; fromSlot: number; toZone: string; toSlot: number }
  | { t: "buyConspiracy"; payment: Partial<Record<Resource, number>> }
  | { t: "playConspiracy"; cardId: string; targets?: unknown }
  | { t: "trade"; with: PlayerId; give: TradeBundle; receive: TradeBundle }
  | { t: "useIdeologuePower"; ideologue: Ideologue; level: 3|5; params?: unknown }
  | { t: "endTurn" }
  | { t: "acknowledgeHandoff" }                   // moves phase past the interstitial
  | { t: "discardResourcesToCap"; discards: Partial<Record<Resource, number>> };
```

### Reducer model

`applyAction(state, action): { state, error? }` — pure function. The reducer is the *only* entry point that mutates state; the UI never touches `GameState` directly. Every action is validated:
- Phase legality (e.g. can't `gerrymander` during `headlines`).
- Resource sufficiency.
- Adjacency (for gerrymander/Guerilla/etc — though Guerilla is Elite-only and out of scope).
- Slot availability.
- Majority/Volatile-Area special rules (voters in Volatile Areas cannot be moved/discarded/converted).

Majority checks run **after every voter placement, eviction, conversion, or gerrymander** via a `recomputeMajorities(zone)` helper. Majority formation/breaking is automatic and idempotent — no dedicated `formMajority` action.

### Determinism & shuffling

Shuffles use a seeded PRNG (mulberry32 or similar — ~10 lines, no dep) keyed by `rngSeed`. The seed is captured at `setupGame` and stored in `GameState`, making the entire game deterministic and replayable from the action log. This also makes engine tests trivial to write.

### Persistence

`zustand` `persist` middleware → `localStorage` key `shashn-online:game`. Saves after every action (debounced via zustand built-in). On boot, if a saved state exists, offer "Resume" or "New Game".

---

## Board

Until the physical board is photographed, model the 9 zones as a **3×3 grid** (NW, N, NE, W, C, E, SW, S, SE) with 4-way adjacency. Capacities and majority thresholds tuned to plausible values (8–14 capacity, ceil(cap/2)+1 majority); place 11 Volatile Areas distributed across zones per the rulebook. All values live in `src/data/board.ts` — easy to update once we measure the real board.

---

## Card stubs (v1 content)

Just enough to make every mechanic exercisable end-to-end. Each stub is a real, typed card object — the schema is the same the user will fill in later for real card text.

- **Ideology (~20 cards):** 5 per Ideologue archetype. Each has `left`/`right` answer texts + a `resources` payout for each side. Resource payouts mirror the patterns implied by the rulebook (a Capitalist side gives Funds, a Supremo side gives Clout, etc.). At least 2 are marked "sensitive" so the Content Advisory toggle is exercised.
- **Voter (~10 cards):** mix of 1-, 2-, and 3-voter cards at typical resource costs (e.g. 2-voter = 2 resources, with `any` resource indicated by `?`).
- **Conspiracy (~5 cards):** each is a `{ id, cost, effect: ConspiracyEffect }`. We implement effects as a small enum of templated handlers — `discardOpponentVoter`, `gainResources`, `peekConspiracy`, `forceTrade`, `extraVoterCard`. Five distinct effects cover the engine surface area.
- **Headline (~5 cards):** similar — `gainResources`, `loseResources`, `discardRandomVoter`, `moveVoter`, `globalResourceShift`.

Each card file exports a typed array; a future task can replace contents with the full retail deck without touching engine code.

---

## UI flow

1. **Setup screen** — pick number of players (2–5), enter names, optionally toggle "Remove sensitive cards" (Content Advisory).
2. **First-player vote** — simple modal where each player taps a name (can't vote for self). Starting resources auto-distributed per rulebook (P1: 1, P2: 2, ... P5: 5).
3. **Game loop:**
   - **Handoff screen** — "Pass to Player N. The player on Player N's RIGHT should hold the device and tap to draw Player N's Ideology Card." Right-neighbor sees both options, taps to "show options to <active player>"; active player picks left or right. Trust convention: right-neighbor must not look while active player chooses, but the screen explicitly displays both options anyway since this is digital. *(This deviates slightly from the physical rule where only the right-neighbor sees the card — acceptable for a digital adaptation; the alternative would require two devices.)*
   - **Action phase** — the main game screen. Board (Zone components arranged 3×3), HQ Mat at top (3 face-up voter cards + deck indicators), active player's mat on the right (resources, ideology cards collected, conspiracy hand, unlocked powers). Action bar at bottom: Influence Voter Card, Gerrymander, Trade, Buy/Play Conspiracy, Use Power, End Turn. Each opens a modal as needed.
   - **Post-turn** — auto-resolve queued Headline Cards (Volatile-Area triggers) with a modal per headline.
   - **End game** — when every zone's majority is decided (or board fills), show final scores; the player who triggered the end gets one last turn per the rulebook.
4. **End screen** — winner banner, score breakdown by zone, "Play again" button.

---

## Critical files / new modules

All files are new (greenfield repo). The most important ones to get right:

- `src/engine/types.ts` — shape determines everything else.
- `src/engine/reducer.ts` — single dispatcher; every action handler routes through here.
- `src/engine/rules/majorities.ts` — must be called from every code path that mutates voters; this is the easiest place to introduce bugs.
- `src/engine/rules/gerrymander.ts` — adjacency + non-majority + Volatile-Area restrictions are subtle; cover thoroughly with tests.
- `src/data/board.ts` — placeholder layout; the one file we'll tune once the physical board is examined.
- `src/store/gameStore.ts` — `persist` config + a versioned schema so future state-shape changes don't brick saved games.
- `src/ui/screens/Handoff.tsx` — load-bearing for the hidden-info promise.

---

## Implementation order (rough day-by-day)

1. **Day 1:** Scaffold (`npm create vite`, Tailwind, Zustand, Vitest). Write `types.ts`, `state.ts`, `board.ts`. Stub all card files. Get `applyAction(setupGame)` working with tests.
2. **Day 2:** Implement `ideology.ts`, `voterCards.ts`, `majorities.ts`, `turn.ts`. Tests for each. By end of day 2 the engine can simulate a full turn programmatically (in tests).
3. **Day 3:** Implement `gerrymander.ts`, `trade.ts`, `headlines.ts`, `conspiracy.ts`, `powers.ts` (passive + L3 + L5 for all 4 Ideologues — these are well-specified in pages 32–37 of the rulebook). End-game scoring.
4. **Day 4:** UI scaffolding — Setup, Handoff, Game screens, Board, PlayerMat, ActionBar. Wire to store.
5. **Day 5:** UI modals — IdeologyCard, ConspiracyCard, HeadlineCard, Trade. Polish hand-off screen. Persistence.
6. **Day 6:** Manual play-through with 2 then 4 simulated players in one browser. Fix bugs. Tune card stubs and board values.
7. **Day 7+ (optional):** Replace stub cards with real card content as the user enters it; add Elites/Home Turfs/Chaos in follow-ups.

---

## Verification

End-to-end testing strategy:

1. **Engine unit tests (`vitest`)** for every rule module. Cover:
   - Setup distributes correct starting resources.
   - Ideology answer grants exactly the listed resources; resource cap enforced.
   - Voter card influence requires the right resources; 3-voter card discards if zone can't fit all 3.
   - Majority forms exactly at threshold; breaks if voters removed below threshold.
   - Gerrymander rejects majority voters, Volatile-Area voters, non-adjacent zones.
   - Conspiracy/Headline effect handlers produce the right state delta.
   - Game ends when all majorities decided; winner has the most majority voters.
2. **Manual browser test:** Open `vite dev`, run a 3-player game to completion in one browser tab using hot-seat. Verify:
   - Handoff hides the previous player's conspiracy hand.
   - Refresh mid-game restores the exact state.
   - All four Ideologue powers (passive, L3, L5) work for at least one player who unlocks them.
   - End-game screen shows correct scores.
3. **Determinism check:** Seed the RNG, record the action log of a played game, replay the log → resulting state must match exactly. (Doubles as the manual save/load test.)
4. **Performance is irrelevant** at this scale — no benchmarks needed.

---

## Out of scope (explicitly)

- Online multiplayer / networking / accounts / matchmaking.
- AI opponents.
- Elites, Home Turfs, Edge of Chaos, Cost of Victory, 2-Player Mode (KS promo / separate board).
- Sensitive-content card filtering beyond a single toggle at setup.
- Mobile-optimized layout — desktop browser only for v1.
- Real card content — stubs only.
- Privilege tie-breaker rule (per rulebook designer's note, non-binding; we'll just use total-voters-on-board as a sub-tiebreak, then random).

These can be follow-ups once the base v1 is fun.
