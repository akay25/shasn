import type { ConspiracyCard } from "@/engine/types";

// Stub Conspiracy Cards for v1. Each card exercises a different
// ConspiracyEffectKind so the conspiracy engine's full effect surface is
// covered by the placeholder deck.
//
// Per rulebook p.19, conspiracies cost 4-5 of any resource combination. The
// numeric `cost` field here is that "any-resource" total.

export const CONSPIRACY_CARDS: ConspiracyCard[] = [
  {
    id: "c-001",
    name: "Smear Campaign",
    description:
      "Choose an opponent's non-majority voter anywhere on the board and discard it.",
    cost: 5,
    effect: {
      kind: "discardOpponentVoter",
      // params: { targetPlayerId, zoneId, slotIdx } — resolved at play time.
    },
  },
  {
    id: "c-002",
    name: "Slush Fund",
    description:
      "Quietly draw resources from off-book backers. Gain 2 Funds and 1 resource of your choice.",
    cost: 4,
    effect: {
      kind: "gainResources",
      params: { resources: { funds: 2, any: 1 } },
    },
  },
  {
    id: "c-003",
    name: "Mole in the Cabinet",
    description:
      "Choose an opponent. Privately reveal one Conspiracy Card from their hand to yourself.",
    cost: 4,
    effect: {
      kind: "peekConspiracy",
      // params: { targetPlayerId }
    },
  },
  {
    id: "c-004",
    name: "Rally the Faithful",
    description:
      "Influence one open Voter Card from the HQ Mat for free, ignoring its resource cost.",
    cost: 5,
    effect: {
      kind: "extraVoterCard",
      // params: { openIdx }
    },
  },
  {
    id: "c-005",
    name: "District Redraw",
    description:
      "Swap any two non-majority voters on the board, within a zone or across zones. Volatile voters may not be moved.",
    cost: 5,
    effect: {
      kind: "swapVoters",
      // params: { zoneA, slotA, zoneB, slotB }
    },
  },
];
