// Short, UI-friendly descriptions of the four Ideologues and their unlockable
// powers. Used by the hover popover on the ideology coin in
// <IdeologyCollection>. Numbers (per-turn caps, costs) come straight from the
// engine; the prose paraphrases the published rulebook in a tooltip-friendly
// way so it fits in the side panel.

import type { Ideologue, Resource } from "@/engine/types";

export interface IdeologuePower {
  name: string;
  perTurn?: number;        // hard per-turn cap, when applicable
  description: string;
}

export interface IdeologueInfo {
  resource: Resource;       // which resource the ideologue maps to
  tagline: string;          // one-line flavour
  passive: string;          // passive power description
  level3: IdeologuePower;
  level5: IdeologuePower;
}

export const IDEOLOGUE_INFO: Record<Ideologue, IdeologueInfo> = {
  capitalist: {
    resource: "funds",
    tagline: "Bankrolls the campaign with industry money.",
    passive:
      "For every 2 Capitalist cards you hold, gain +1 Funds at the start of your turn.",
    level3: {
      name: "Prospecting",
      perTurn: 1,
      description:
        "Once per turn, pay 1 resource to the Public Reserve and take any 2 resources of your choice.",
    },
    level5: {
      name: "Land Grab",
      perTurn: 3,
      description:
        "Up to 3 times per turn, evict any 1 voter from the board (majority voters included). The voter returns to its owner's pending placements next turn.",
    },
  },
  supremo: {
    resource: "clout",
    tagline: "Builds a base through coalitions, populism and pressure.",
    passive:
      "For every 2 Supremo cards you hold, gain +1 Clout at the start of your turn.",
    level3: {
      name: "Donations",
      perTurn: 2,
      description:
        "Up to 2 times per turn, snatch 1 resource from another player (no payment required).",
    },
    level5: {
      name: "Payback",
      perTurn: 2,
      description:
        "Up to 2 times per turn, pay 1 resource to discard 1 opponent voter (majority voters included).",
    },
  },
  showstopper: {
    resource: "media",
    tagline: "Wins headlines, attention and the news cycle.",
    passive:
      "For every 2 Showstopper cards you hold, gain +1 Media at the start of your turn.",
    level3: {
      name: "Going Viral",
      perTurn: 2,
      description:
        "Up to 2 times per turn, get +1 voter on a Voter Card you influence this turn.",
    },
    level5: {
      name: "Election Fever",
      description:
        "While Gerrymandering, move 2 voters per zone you control (majority voters included) instead of 1.",
    },
  },
  idealist: {
    resource: "trust",
    tagline: "Earns trust by championing access, fairness and conscience.",
    passive:
      "For every 2 Idealist cards you hold, gain +1 Trust at the start of your turn.",
    level3: {
      name: "Helping Hands",
      perTurn: 2,
      description:
        "Up to 2 times per turn, apply a -1 resource discount on a purchase (Voter Card influence or Conspiracy buy).",
    },
    level5: {
      name: "Tough Love",
      perTurn: 1,
      description:
        "Once per turn, spend 2 Trust + any 2 to convert 2 of an opponent's voters in the same zone (majority voters included).",
    },
  },
};
