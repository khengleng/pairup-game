import { describe, it, expect } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  validateAndNormalizeCompletion,
  getPairCount,
  minPlausibleSeconds,
} from "./gameLogic";

describe("Anti-cheat scoring", () => {
  describe("getPairCount", () => {
    it("returns the pair count per grid size", () => {
      expect(getPairCount("4x4")).toBe(8);
      expect(getPairCount("6x6")).toBe(18);
      expect(getPairCount("8x8")).toBe(32);
    });

    it("rejects an unknown grid size", () => {
      expect(() => getPairCount("3x3")).toThrow(TRPCError);
    });
  });

  describe("validateAndNormalizeCompletion", () => {
    const legit = {
      gridSize: "4x4",
      moves: 12,
      timeSeconds: 40,
      elapsedSeconds: 42,
    };

    it("accepts a plausible completion and computes totalScore", () => {
      const result = validateAndNormalizeCompletion(legit);
      expect(result.moves).toBe(12);
      expect(result.timeSeconds).toBe(40);
      expect(result.totalScore).toBe(52);
    });

    it("rejects the classic forge: instant completion (wall-clock floor)", () => {
      // 8x8 needs >= ceil(32 * 0.4) = 13s of real time; only 1s elapsed.
      expect(() =>
        validateAndNormalizeCompletion({
          gridSize: "8x8",
          moves: 32,
          timeSeconds: 0,
          elapsedSeconds: 1,
        })
      ).toThrow(/faster than physically possible/);
    });

    it("rejects a move count below the perfect-game minimum", () => {
      expect(() =>
        validateAndNormalizeCompletion({
          gridSize: "4x4",
          moves: 7, // fewer than 8 pairs is impossible
          timeSeconds: 40,
          elapsedSeconds: 42,
        })
      ).toThrow(/invalid move count/);
    });

    it("clamps an impossibly-fast reported time up to the physical floor", () => {
      // Player waited long enough (wall clock ok) but client claims 0s.
      const result = validateAndNormalizeCompletion({
        gridSize: "8x8",
        moves: 32,
        timeSeconds: 0,
        elapsedSeconds: 60,
      });
      expect(result.timeSeconds).toBe(minPlausibleSeconds(32)); // 13
    });

    it("clamps a reported time that exceeds wall clock down to elapsed + grace", () => {
      const result = validateAndNormalizeCompletion({
        gridSize: "4x4",
        moves: 12,
        timeSeconds: 99999,
        elapsedSeconds: 30,
      });
      expect(result.timeSeconds).toBe(35); // 30 + 5 grace
    });

    it("accepts the exact perfect game (moves === pairs)", () => {
      const result = validateAndNormalizeCompletion({
        gridSize: "6x6",
        moves: 18,
        timeSeconds: 30,
        elapsedSeconds: 31,
      });
      expect(result.moves).toBe(18);
      expect(result.totalScore).toBe(48);
    });
  });
});
