import { describe, it, expect, vi } from "vitest";
import {
  STUB_IDEOLOGY_CARDS,
  STUB_VOTER_CARDS,
  STUB_CONSPIRACY_CARDS,
  STUB_HEADLINE_CARDS,
  freshState,
  placeVoters,
} from "./_stubs";

vi.mock("@/data/cards/ideology",   () => ({ IDEOLOGY_CARDS:   STUB_IDEOLOGY_CARDS   }));
vi.mock("@/data/cards/voter",      () => ({ VOTER_CARDS:      STUB_VOTER_CARDS      }));
vi.mock("@/data/cards/conspiracy", () => ({ CONSPIRACY_CARDS: STUB_CONSPIRACY_CARDS }));
vi.mock("@/data/cards/headline",   () => ({ HEADLINE_CARDS:   STUB_HEADLINE_CARDS   }));

import { recomputeMajorities } from "@/engine/rules/majorities";
import { getZone } from "@/data/board";

describe("majorities", () => {
  it("forms a majority when threshold reached", () => {
    const s = freshState();
    const zoneId = "nw"; // capacity 9, threshold 5
    const threshold = getZone(zoneId).majorityRequirement;
    placeVoters(s, zoneId, "p1", threshold);
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe("p1");
    const majorityCount = s.zones[zoneId].slots.filter((v) => v?.isMajority).length;
    expect(majorityCount).toBe(threshold);
  });

  it("doesn't form when below threshold", () => {
    const s = freshState();
    const zoneId = "nw";
    const threshold = getZone(zoneId).majorityRequirement;
    placeVoters(s, zoneId, "p1", threshold - 1);
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe(null);
    expect(s.zones[zoneId].slots.filter((v) => v?.isMajority).length).toBe(0);
  });

  it("breaks majority when voter count drops below threshold", () => {
    const s = freshState();
    const zoneId = "nw";
    const threshold = getZone(zoneId).majorityRequirement;
    placeVoters(s, zoneId, "p1", threshold);
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe("p1");
    s.zones[zoneId].slots[0] = null;
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe(null);
    expect(s.zones[zoneId].slots.filter((v) => v?.isMajority).length).toBe(0);
  });

  it("only requirement-many voters flipped; extras remain blank", () => {
    const s = freshState();
    const zoneId = "nw";
    const threshold = getZone(zoneId).majorityRequirement; // 5
    placeVoters(s, zoneId, "p1", threshold + 2); // 7
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe("p1");
    expect(s.zones[zoneId].slots.filter((v) => v?.isMajority).length).toBe(threshold);
    expect(s.zones[zoneId].slots.filter((v) => v && !v.isMajority).length).toBe(2);
  });

  it("majority breaks if voters drop; another player below threshold doesn't take over", () => {
    const s = freshState();
    const zoneId = "c"; // capacity 16, threshold 8
    placeVoters(s, zoneId, "p1", 8);
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe("p1");
    placeVoters(s, zoneId, "p2", 7);
    recomputeMajorities(s, zoneId);
    expect(s.zones[zoneId].majorityHolder).toBe("p1");
    // Remove 2 of p1.
    let removed = 0;
    for (let i = 0; i < s.zones[zoneId].slots.length && removed < 2; i++) {
      if (s.zones[zoneId].slots[i]?.playerId === "p1") {
        s.zones[zoneId].slots[i] = null;
        removed++;
      }
    }
    recomputeMajorities(s, zoneId);
    // p1 now has 6 (< 8), p2 has 7 (< 8). No majority.
    expect(s.zones[zoneId].majorityHolder).toBe(null);
  });
});
