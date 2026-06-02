import type { HeadlineCard } from "@/engine/types";

// Stub Headline Cards for v1. Each card exercises a different
// HeadlineEffectKind so the headline-resolution engine is covered end-to-end.
//
// Headlines are triggered when a voter is placed in a Volatile Area
// (rulebook p.18) and resolved at the end of the ongoing turn.

export const HEADLINE_CARDS: HeadlineCard[] = [
  {
    id: "h-001",
    name: "Foreign Investors Flood the Capital",
    description:
      "A wave of overseas capital tilts the markets your way. Gain 2 Funds and 1 Media.",
    effect: {
      kind: "gainResources",
      params: { resources: { funds: 2, media: 1 } },
    },
  },
  {
    id: "h-002",
    name: "Audit Scandal Breaks",
    description:
      "An inconvenient audit hits the front pages. Lose 2 Funds and 1 Clout (down to zero).",
    effect: {
      kind: "loseResources",
      params: { resources: { funds: 2, clout: 1 } },
    },
  },
  {
    id: "h-003",
    name: "National Day of Solidarity",
    description:
      "A unifying day of marches lifts every campaign. Every player gains 1 Trust.",
    effect: {
      kind: "globalResourceShift",
      params: { resources: { trust: 1 } },
    },
  },
  {
    id: "h-004",
    name: "Defection at Dawn",
    description:
      "One of your supporters defects to a rival movement. Discard one of your random non-majority voters from the board.",
    effect: {
      kind: "discardRandomVoter",
    },
  },
  {
    id: "h-005",
    name: "Forced Resettlement Order",
    description:
      "Bureaucratic upheaval reshuffles a district. Move one of your non-majority voters to an adjacent zone.",
    effect: {
      kind: "moveVoter",
      // params: { fromZone, fromSlot, toZone, toSlot } — resolved at play time.
    },
  },
];
