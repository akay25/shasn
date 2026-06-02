import type { IdeologyCard } from "@/engine/types";

// Stub Ideology Cards for v1. Each card poses a policy dilemma; the two sides
// belong to different Ideologues (capitalist / supremo / showstopper /
// idealist) and pay out resources that match those archetypes:
//
//   capitalist  -> funds
//   supremo     -> clout
//   showstopper -> media
//   idealist    -> trust
//
// Payouts vary in size (1-3) and shape (single resource, mixed bundles, and
// occasional `any: 1` for player choice). Two cards carry a Content Advisory
// marker so the "Remove sensitive cards" toggle is actually exercised by the
// stub deck. Ideologue distribution is 10 sides per archetype across the 20
// cards.

export const IDEOLOGY_CARDS: IdeologyCard[] = [
  {
    id: "id-001",
    prompt: "Should the government tax luxury goods more aggressively?",
    left: {
      text: "Yes — redistribute wealth toward public services.",
      ideologue: "idealist",
      payout: { trust: 2 },
    },
    right: {
      text: "No — let markets and consumer choice decide.",
      ideologue: "capitalist",
      payout: { funds: 2 },
    },
    advisory: null,
  },
  {
    id: "id-002",
    prompt: "Should the national language be made compulsory in all schools?",
    left: {
      text: "Yes — a shared tongue forges a shared nation.",
      ideologue: "supremo",
      payout: { clout: 2, funds: 1 },
    },
    right: {
      text: "No — let regions teach in the language they live in.",
      ideologue: "showstopper",
      payout: { media: 2 },
    },
    advisory: null,
  },
  {
    id: "id-003",
    prompt: "Should public infrastructure be funded by private toll concessions?",
    left: {
      text: "Yes — bring in capital and run roads like a business.",
      ideologue: "capitalist",
      payout: { funds: 3 },
    },
    right: {
      text: "Tolls only where the political coalition demands it.",
      ideologue: "supremo",
      payout: { clout: 2, any: 1 },
    },
    advisory: null,
  },
  {
    id: "id-004",
    prompt: "Should the state subsidise a national film and arts council?",
    left: {
      text: "Yes — culture is soft power; bankroll it loudly.",
      ideologue: "showstopper",
      payout: { media: 2, clout: 1 },
    },
    right: {
      text: "Fund only programmes that broaden access for the poor.",
      ideologue: "idealist",
      payout: { trust: 2, any: 1 },
    },
    advisory: null,
  },
  {
    id: "id-005",
    prompt: "Should fossil-fuel subsidies be cut to fund a green transition?",
    left: {
      text: "Keep the subsidies — protect jobs and producer margins.",
      ideologue: "capitalist",
      payout: { funds: 2, media: 1 },
    },
    right: {
      text: "Phase them out — let solar and wind take the headlines.",
      ideologue: "showstopper",
      payout: { media: 2, trust: 1 },
    },
    advisory: null,
  },
  {
    id: "id-006",
    prompt: "Should the central bank be brought under direct political control?",
    left: {
      text: "Yes — elected leaders should set monetary policy.",
      ideologue: "supremo",
      payout: { clout: 3 },
    },
    right: {
      text: "No — independence protects ordinary savers.",
      ideologue: "idealist",
      payout: { trust: 2, any: 1 },
    },
    advisory: null,
  },
  {
    id: "id-007",
    prompt: "Should agricultural land be opened to large corporate buyers?",
    left: {
      text: "Yes — consolidation will modernise the farm sector.",
      ideologue: "capitalist",
      payout: { funds: 2, clout: 1 },
    },
    right: {
      text: "No — protect smallholders and rural livelihoods.",
      ideologue: "idealist",
      payout: { trust: 3 },
    },
    advisory: null,
  },
  {
    id: "id-008",
    prompt: "Should the country deploy facial-recognition cameras across all major cities?",
    left: {
      text: "Yes — public safety is worth the trade-off.",
      ideologue: "supremo",
      payout: { clout: 2, media: 1 },
    },
    right: {
      text: "Only with a flashy oversight commission to manage perception.",
      ideologue: "showstopper",
      payout: { media: 3 },
    },
    advisory: "mature",
  },
  {
    id: "id-009",
    prompt: "Should the government underwrite a flagship semiconductor fab?",
    left: {
      text: "Yes — pour funds in; strategic industries cannot wait.",
      ideologue: "capitalist",
      payout: { funds: 3, any: 1 },
    },
    right: {
      text: "Yes — and make sure the ribbon-cutting belongs to the party.",
      ideologue: "supremo",
      payout: { clout: 2, funds: 1 },
    },
    advisory: null,
  },
  {
    id: "id-010",
    prompt: "Should the constitution be amended to recognise a state religion?",
    left: {
      text: "Yes — celebrate the majority's faith openly.",
      ideologue: "showstopper",
      payout: { media: 2, clout: 1 },
    },
    right: {
      text: "No — the state must remain a home for every faith and none.",
      ideologue: "idealist",
      payout: { trust: 3 },
    },
    advisory: "trigger",
  },
  {
    id: "id-011",
    prompt: "Should ride-share and delivery workers be classified as employees?",
    left: {
      text: "No — flexibility is what makes the platforms work.",
      ideologue: "capitalist",
      payout: { funds: 2, any: 1 },
    },
    right: {
      text: "Yes — and announce it on every news channel by morning.",
      ideologue: "showstopper",
      payout: { media: 2, trust: 1 },
    },
    advisory: null,
  },
  {
    id: "id-012",
    prompt: "Should military service be made compulsory for one year after school?",
    left: {
      text: "Yes — discipline and duty must be taught early.",
      ideologue: "supremo",
      payout: { clout: 3 },
    },
    right: {
      text: "No — offer a civilian service alternative for conscience.",
      ideologue: "idealist",
      payout: { trust: 2, media: 1 },
    },
    advisory: null,
  },
  {
    id: "id-013",
    prompt: "Should inheritance above a high threshold be heavily taxed?",
    left: {
      text: "No — earned and inherited wealth deserve equal protection.",
      ideologue: "capitalist",
      payout: { funds: 2, clout: 1 },
    },
    right: {
      text: "Yes — opportunity should not be sealed at birth.",
      ideologue: "idealist",
      payout: { trust: 2, any: 1 },
    },
    advisory: null,
  },
  {
    id: "id-014",
    prompt: "Should a charismatic governor be granted emergency powers during the floods?",
    left: {
      text: "Yes — strong hands are needed in a crisis.",
      ideologue: "supremo",
      payout: { clout: 2, funds: 1 },
    },
    right: {
      text: "Yes, with a televised daily briefing carrying the party banner.",
      ideologue: "showstopper",
      payout: { media: 3 },
    },
    advisory: null,
  },
  {
    id: "id-015",
    prompt: "Should state-owned enterprises be privatised at scale?",
    left: {
      text: "Yes — sell them off and let competition do the work.",
      ideologue: "capitalist",
      payout: { funds: 3 },
    },
    right: {
      text: "Only into hands that have been loyal to the movement.",
      ideologue: "supremo",
      payout: { clout: 2, funds: 1 },
    },
    advisory: null,
  },
  {
    id: "id-016",
    prompt: "Should refugees fleeing the southern war be granted citizenship after five years?",
    left: {
      text: "Yes — host a televised citizenship ceremony, broadcast nationwide.",
      ideologue: "showstopper",
      payout: { media: 2, clout: 1 },
    },
    right: {
      text: "Yes — and ensure pathways to work, education and dignity.",
      ideologue: "idealist",
      payout: { trust: 3 },
    },
    advisory: "trigger",
  },
  {
    id: "id-017",
    prompt: "Should the national stock exchange be deregulated to attract foreign capital?",
    left: {
      text: "Yes — and host a glittering launch gala to mark the moment.",
      ideologue: "capitalist",
      payout: { funds: 2, media: 1 },
    },
    right: {
      text: "Liberalise, but use the spotlight to push our brand of reform.",
      ideologue: "showstopper",
      payout: { media: 2, funds: 1 },
    },
    advisory: null,
  },
  {
    id: "id-018",
    prompt: "Should the government restrict foreign-funded non-profits?",
    left: {
      text: "Yes — outside money has no business shaping our politics.",
      ideologue: "supremo",
      payout: { clout: 2, any: 1 },
    },
    right: {
      text: "No — civil society is part of a healthy democracy.",
      ideologue: "idealist",
      payout: { trust: 2, media: 1 },
    },
    advisory: null,
  },
  {
    id: "id-019",
    prompt: "Should the state offer a guaranteed basic income to the long-term unemployed?",
    left: {
      text: "No — work, not welfare, is what builds a productive citizen.",
      ideologue: "capitalist",
      payout: { funds: 2, any: 1 },
    },
    right: {
      text: "Yes — start with a pilot, measure the outcomes, and expand.",
      ideologue: "idealist",
      payout: { trust: 2, funds: 1 },
    },
    advisory: null,
  },
  {
    id: "id-020",
    prompt: "Should the country host the next continental sporting championship?",
    left: {
      text: "Yes — the prestige is worth every stadium we build.",
      ideologue: "supremo",
      payout: { clout: 2, media: 1 },
    },
    right: {
      text: "Yes — and broadcast the opening ceremony in every language.",
      ideologue: "showstopper",
      payout: { media: 3 },
    },
    advisory: null,
  },
];
