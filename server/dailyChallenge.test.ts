import { describe, it, expect } from "vitest";
import {
  createSeededDeck,
  pickDailyChallenge,
  getDailyDateKey,
  dailyDeckSeed,
  hashStringToSeed,
} from "@shared/gameConfig";

const PAIRS = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  term: `T${i + 1}`,
  definition: `D${i + 1}`,
}));

describe("daily challenge determinism", () => {
  it("produces the same deck for the same seed", () => {
    const a = createSeededDeck(PAIRS, 12345);
    const b = createSeededDeck(PAIRS, 12345);
    expect(a).toEqual(b);
  });

  it("produces a different deck for a different seed", () => {
    const a = createSeededDeck(PAIRS, 1);
    const b = createSeededDeck(PAIRS, 2);
    expect(a).not.toEqual(b);
  });

  it("keeps every card (2 per pair) after shuffling", () => {
    const deck = createSeededDeck(PAIRS, 999);
    expect(deck).toHaveLength(16);
    const ids = deck.map(c => c.pairId).sort((x, y) => x - y);
    expect(ids).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8]);
  });

  it("picks the same challenge for the same date + themes", () => {
    const themes = ["Products", "Features", "Team"];
    const a = pickDailyChallenge("2026-07-04", themes);
    const b = pickDailyChallenge("2026-07-04", themes);
    expect(a).toEqual(b);
    expect(themes).toContain(a.theme);
    expect(["4x4", "6x6", "8x8"]).toContain(a.gridSize);
  });

  it("varies the challenge across days", () => {
    const themes = ["Products", "Features", "Team"];
    const keys = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"].map(
      d => JSON.stringify(pickDailyChallenge(d, themes))
    );
    expect(new Set(keys).size).toBeGreaterThan(1);
  });

  it("derives the deck seed consistently with the challenge", () => {
    const c = pickDailyChallenge("2026-07-04", ["Products", "Features"]);
    expect(dailyDeckSeed(c.date, c.theme, c.gridSize)).toBe(c.seed);
    expect(dailyDeckSeed(c.date, c.theme, c.gridSize)).toBe(
      hashStringToSeed(`2026-07-04:${c.theme}:${c.gridSize}`)
    );
  });

  it("formats the UTC date key", () => {
    expect(getDailyDateKey(new Date("2026-07-04T23:30:00.000Z"))).toBe(
      "2026-07-04"
    );
  });
});
