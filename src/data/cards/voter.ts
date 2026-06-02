import type { VoterCard } from "@/engine/types";

// Stub Voter Cards for v1. Voter cards cost a combination of resources and
// award 1, 2 or 3 voter pegs (rulebook p.10). The deck mixes counts roughly
// 3 / 4 / 3 across the ten stubs.
//
// `any: N` slots let the player spend any resource — this matches the
// rulebook's "?" symbol on Voter Cards.
//
// Costs scale loosely with voter count: 1-voter cards cost ~2 resources,
// 2-voter cards cost ~3 resources, and 3-voter cards cost ~4-5 resources.

export const VOTER_CARDS: VoterCard[] = [
  // ----- 1-voter cards (3) -----
  { id: "v-001", voters: 1, cost: { funds: 1, any: 1 } },
  { id: "v-002", voters: 1, cost: { clout: 2 } },
  { id: "v-003", voters: 1, cost: { trust: 1, media: 1 } },

  // ----- 2-voter cards (4) -----
  { id: "v-004", voters: 2, cost: { funds: 1, any: 2 } },
  { id: "v-005", voters: 2, cost: { clout: 1, media: 1, any: 1 } },
  { id: "v-006", voters: 2, cost: { trust: 2, funds: 1 } },
  { id: "v-007", voters: 2, cost: { media: 2, clout: 1 } },

  // ----- 3-voter cards (3) -----
  { id: "v-008", voters: 3, cost: { funds: 2, clout: 1, any: 1 } },
  { id: "v-009", voters: 3, cost: { trust: 2, media: 2 } },
  { id: "v-010", voters: 3, cost: { clout: 2, media: 1, any: 2 } },
];
