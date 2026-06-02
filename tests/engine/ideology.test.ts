import { describe, it, expect, vi } from "vitest";
import {
  STUB_IDEOLOGY_CARDS,
  STUB_VOTER_CARDS,
  STUB_CONSPIRACY_CARDS,
  STUB_HEADLINE_CARDS,
  freshState,
} from "./_stubs";

vi.mock("@/data/cards/ideology",   () => ({ IDEOLOGY_CARDS:   STUB_IDEOLOGY_CARDS   }));
vi.mock("@/data/cards/voter",      () => ({ VOTER_CARDS:      STUB_VOTER_CARDS      }));
vi.mock("@/data/cards/conspiracy", () => ({ CONSPIRACY_CARDS: STUB_CONSPIRACY_CARDS }));
vi.mock("@/data/cards/headline",   () => ({ HEADLINE_CARDS:   STUB_HEADLINE_CARDS   }));

import { applyAction } from "@/engine/reducer";

describe("ideology", () => {
  it("draws and answers; payout and passive bonuses", () => {
    let s = freshState();
    // acknowledgeHandoff draws a card.
    const ack = applyAction(s, { t: "acknowledgeHandoff" });
    expect(ack.ok).toBe(true);
    if (!ack.ok) return;
    expect(ack.state.phase).toBe("ideology");
    expect(ack.state.currentIdeologyCard).not.toBeNull();
    expect(ack.state.powerUsage).toEqual({}); // reset

    s = ack.state;
    const before = { ...s.players[0].resources };
    const ans = applyAction(s, { t: "answerIdeology", side: "left" });
    expect(ans.ok).toBe(true);
    if (!ans.ok) return;
    expect(ans.state.phase).toBe("actions");
    // Left side of every stub card gives +1 funds, +1 clout.
    expect(ans.state.players[0].resources.funds).toBe(before.funds + 1);
    expect(ans.state.players[0].resources.clout).toBe(before.clout + 1);
    expect(ans.state.players[0].ideologyCards.length).toBe(1);
  });

  it("passive: 2 cards of same ideologue → +1 resource of that type", () => {
    let s = freshState();
    s.activePlayerIdx = 0;
    // Manually grant one capitalist card already (so the next one triggers passive).
    s.players[0].ideologyCards.push({ cardId: "cap-0", side: "left" });
    // Now force the top of deck to be another capitalist.
    s.decks.ideology = ["cap-1", "sup-0"];
    s.phase = "handoff";
    const ack = applyAction(s, { t: "acknowledgeHandoff" });
    if (!ack.ok) throw new Error(ack.error);
    s = ack.state;
    expect(s.currentIdeologyCard).toBe("cap-1");
    const before = { ...s.players[0].resources };
    const ans = applyAction(s, { t: "answerIdeology", side: "left" });
    if (!ans.ok) throw new Error(ans.error);
    // Payout +1 funds +1 clout, AND passive +1 funds (2 capitalists).
    expect(ans.state.players[0].resources.funds).toBe(before.funds + 2);
    expect(ans.state.players[0].resources.clout).toBe(before.clout + 1);
  });

  it("redraw costs any 4 resources", () => {
    let s = freshState();
    s.phase = "handoff";
    const ack = applyAction(s, { t: "acknowledgeHandoff" });
    if (!ack.ok) throw new Error(ack.error);
    s = ack.state;
    const before = { ...s.players[0].resources };
    const first = s.currentIdeologyCard!;
    const red = applyAction(s, { t: "redrawIdeology" });
    expect(red.ok).toBe(true);
    if (!red.ok) return;
    // Total resources dropped by 4.
    const r = red.state.players[0].resources;
    const total = r.funds + r.clout + r.media + r.trust;
    const beforeTotal = before.funds + before.clout + before.media + before.trust;
    expect(total).toBe(beforeTotal - 4);
    // A new card was drawn.
    expect(red.state.currentIdeologyCard).not.toBeNull();
    expect(red.state.currentIdeologyCard).not.toBe(first);
  });

  it("redraw fails if player has < 4 resources", () => {
    let s = freshState();
    s.players[0].resources = { funds: 1, clout: 1, media: 1, trust: 0 };
    s.phase = "handoff";
    const ack = applyAction(s, { t: "acknowledgeHandoff" });
    if (!ack.ok) throw new Error(ack.error);
    const red = applyAction(ack.state, { t: "redrawIdeology" });
    expect(red.ok).toBe(false);
  });
});
