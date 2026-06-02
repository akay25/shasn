// Core domain types for SHASN. The engine, data, and UI all import from here.
// This file is the contract between the three implementation areas — extend
// carefully and prefer additive changes.

export type Resource = "funds" | "clout" | "media" | "trust";
export const RESOURCES: Resource[] = ["funds", "clout", "media", "trust"];

export type Ideologue = "capitalist" | "supremo" | "showstopper" | "idealist";
export const IDEOLOGUES: Ideologue[] = ["capitalist", "supremo", "showstopper", "idealist"];

// Mapping: each Ideologue corresponds to one resource (rulebook p.15).
export const IDEOLOGUE_RESOURCE: Record<Ideologue, Resource> = {
  capitalist: "funds",
  supremo: "clout",
  showstopper: "media",
  idealist: "trust",
};

export type PlayerId = string; // "p1" .. "p5"

// Visual identity colour chosen at setup — independent of the four Ideologues.
// Voter pegs on the board use this colour; the Ideologue concept is reserved
// for ideology cards / resources / powers.
export type PlayerColor =
  | "red"
  | "blue"
  | "yellow"
  | "green"
  | "purple"
  | "pink";
export const PLAYER_COLORS: PlayerColor[] = [
  "red",
  "blue",
  "yellow",
  "green",
  "purple",
  "pink",
];

// ---------- Board ----------

export interface Zone {
  id: string;            // "nw", "n", "ne", "w", "c", "e", "sw", "s", "se"
  name: string;          // human-readable
  capacity: number;      // total voter slots in the zone
  majorityRequirement: number; // voters needed to form majority (e.g. 6 of 11)
  adjacent: string[];    // ids of adjacent zones (used for gerrymander)
  volatileSlotIndices: number[]; // slot indices within this zone that are volatile
}

export interface VoterPlacement {
  playerId: PlayerId;
  isMajority: boolean;   // flipped to party-side once part of a majority
}

export type Slot = VoterPlacement | null;

export interface ZoneState {
  slots: Slot[];                  // length === zone.capacity
  majorityHolder: PlayerId | null;
}

// ---------- Cards ----------

export interface IdeologyCardSide {
  text: string;           // the answer/policy choice
  ideologue: Ideologue;   // which ideologue this side belongs to
  // resources granted on choosing this side. `any` is a player-chosen resource.
  payout: Partial<Record<Resource, number>> & { any?: number };
}

export type ContentAdvisory = "mature" | "trigger" | null;

export interface IdeologyCard {
  id: string;
  prompt: string;             // the policy question
  left: IdeologyCardSide;
  right: IdeologyCardSide;
  advisory?: ContentAdvisory; // null/undefined means safe
}

export interface IdeologyCardChoice {
  cardId: string;
  side: "left" | "right";
}

// Voter cards cost some combination of resources and award N voter pegs.
// `any` means the player may pay with a resource of their choice.
export interface VoterCard {
  id: string;
  voters: 1 | 2 | 3;
  cost: Partial<Record<Resource, number>> & { any?: number };
}

// ---- Conspiracy ----

export type ConspiracyEffectKind =
  | "discardOpponentVoter"   // params: { targetPlayerId, zoneId, slotIdx }
  | "gainResources"          // params: { resources }
  | "peekConspiracy"         // params: { targetPlayerId } — UI revelation
  | "extraVoterCard"         // params: { openIdx } — influence one for free
  | "swapVoters";            // params: { zoneA, slotA, zoneB, slotB } — within or across zones

export interface ConspiracyEffect {
  kind: ConspiracyEffectKind;
  // free-form payload, validated by the handler
  params?: Record<string, unknown>;
}

export interface ConspiracyCard {
  id: string;
  name: string;
  description: string;
  cost: number;              // any-resource cost (4 or 5 per rulebook)
  effect: ConspiracyEffect;
}

// ---- Headline ----

export type HeadlineEffectKind =
  | "gainResources"          // active player +X
  | "loseResources"          // active player -X (down to zero)
  | "globalResourceShift"    // every player gains/loses
  | "discardRandomVoter"     // active player discards a random non-majority voter
  | "moveVoter";             // engine prompts: move one of your voters to adjacent zone

export interface HeadlineEffect {
  kind: HeadlineEffectKind;
  params?: Record<string, unknown>;
}

export interface HeadlineCard {
  id: string;
  name: string;
  description: string;
  effect: HeadlineEffect;
}

// ---------- Player ----------

export interface Player {
  id: PlayerId;
  name: string;
  color: PlayerColor;                      // visual identity, chosen at setup;
                                           // voter pegs on the board use this colour.
  resources: Record<Resource, number>;
  resourceCap: number;                     // default 12
  ideologyCards: IdeologyCardChoice[];     // cards collected (chosen sides face-up)
  conspiracyHand: string[];                // conspiracy card ids in hand
  iouOwed: number;                         // resources owed from auction debt
}

// ---------- Game state ----------

export type Phase =
  | "setup"      // waiting for setupGame action
  | "handoff"    // between turns; show "Pass to Player X"
  | "ideology"   // active player choosing ideology answer
  | "actions"    // active player taking turn actions
  | "headlines"  // resolving queued headlines (one or more)
  | "ended";

export interface PendingPlacement {
  // Voters that have been influenced but not yet placed. They must all be
  // placed before end-turn or they are discarded.
  voters: PlayerId[];        // each entry is the owning player (always active player)
  source: "voterCard" | "evicted" | "chaos" | "donated";
  voterCardId?: string;      // for `voterCard` source — voters must go into one zone
  // Engine-internal: once a `voterCard` bundle has a voter placed in
  // a zone, the remaining voters in the bundle are committed to that
  // same zone (enforced by reducer). Set by `placeVoter` after the
  // first placement of a voter-card bundle.
  committedZoneId?: string;
}

export interface GameEvent {
  turn: number;
  playerId: PlayerId;
  type: string;
  detail?: Record<string, unknown>;
}

export interface IdeologuePowerUsage {
  // tracks per-turn usage caps (e.g. Land Grab: 3x per turn)
  // map: `${ideologue}.${level}` -> count used this turn
  [key: string]: number;
}

export interface GameState {
  phase: Phase;
  players: Player[];
  activePlayerIdx: number;
  turn: number;
  zones: Record<string, ZoneState>;
  decks: {
    ideology: string[];   ideologyDiscard: string[];
    voter: string[];      voterDiscard: string[];
    conspiracy: string[]; conspiracyDiscard: string[];
    headline: string[];   headlineDiscard: string[];
  };
  openVoterCards: [string | null, string | null, string | null];
  currentIdeologyCard: string | null;  // drawn but not yet answered
  pendingPlacements: PendingPlacement[];
  pendingHeadlines: number;            // headlines to resolve at end of turn
  powerUsage: IdeologuePowerUsage;     // resets each turn
  rngSeed: number;
  removeSensitive: boolean;
  log: GameEvent[];
}

// ---------- Actions ----------

export interface TradeBundle {
  resources?: Partial<Record<Resource, number>>;
  conspiracyCardIds?: string[];
}

export type Action =
  | { t: "setupGame"; players: { name: string; color: PlayerColor }[]; seed?: number; removeSensitive?: boolean }
  | { t: "acknowledgeHandoff" }
  | { t: "answerIdeology"; side: "left" | "right" }
  | { t: "redrawIdeology" } // pay any 4 resources, draw a new one
  | { t: "chooseAnyResource"; resource: Resource; amount: number } // resolve `any` payouts
  | { t: "influenceVoterCard"; openIdx: 0 | 1 | 2; payment: Partial<Record<Resource, number>> }
  | { t: "placeVoter"; zoneId: string; slotIdx: number; pendingIdx: number } // place one pending voter
  | { t: "gerrymander"; fromZone: string; fromSlotIdx: number; toZone: string; toSlotIdx: number }
  | { t: "buyConspiracy"; payment: Partial<Record<Resource, number>> }
  | { t: "playConspiracy"; cardId: string; params?: Record<string, unknown> }
  | { t: "trade"; withPlayerId: PlayerId; give: TradeBundle; receive: TradeBundle }
  | { t: "useIdeologuePower"; ideologue: Ideologue; level: 3 | 5; params?: Record<string, unknown> }
  | { t: "resolveHeadline"; params?: Record<string, unknown> }   // next pending headline
  | { t: "discardResources"; discards: Partial<Record<Resource, number>> }
  | { t: "endTurn" };

export type ActionResult =
  | { ok: true; state: GameState; events?: GameEvent[] }
  | { ok: false; error: string };
