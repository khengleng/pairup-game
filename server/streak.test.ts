import { describe, it, expect } from "vitest";
import { computeStreak, previousDateKey } from "./streak";

describe("daily streak logic", () => {
  it("computes the previous UTC day, crossing month boundaries", () => {
    expect(previousDateKey("2026-07-04")).toBe("2026-07-03");
    expect(previousDateKey("2026-07-01")).toBe("2026-06-30");
    expect(previousDateKey("2026-01-01")).toBe("2025-12-31");
  });

  it("starts a streak at 1 on first ever play", () => {
    const s = computeStreak(null, "2026-07-04", 0, 0);
    expect(s).toMatchObject({ streak: 1, bestStreak: 1, advanced: true });
  });

  it("increments on consecutive days", () => {
    const s = computeStreak("2026-07-03", "2026-07-04", 3, 5);
    expect(s.streak).toBe(4);
    expect(s.bestStreak).toBe(5); // best unchanged (5 > 4)
    expect(s.advanced).toBe(true);
  });

  it("raises best streak when the current run exceeds it", () => {
    const s = computeStreak("2026-07-03", "2026-07-04", 5, 5);
    expect(s.streak).toBe(6);
    expect(s.bestStreak).toBe(6);
  });

  it("resets to 1 after a skipped day", () => {
    const s = computeStreak("2026-07-01", "2026-07-04", 9, 12);
    expect(s.streak).toBe(1);
    expect(s.bestStreak).toBe(12);
    expect(s.advanced).toBe(true);
  });

  it("is a no-op when replaying the same day", () => {
    const s = computeStreak("2026-07-04", "2026-07-04", 7, 9);
    expect(s).toMatchObject({
      streak: 7,
      bestStreak: 9,
      advanced: false,
      alreadyPlayedToday: true,
    });
  });
});
