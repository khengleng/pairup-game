import { describe, it, expect } from "vitest";
import {
  validateGroupConfig,
  countByKey,
  buildGroupCard,
} from "../shared/scratch/matchingGroup";
import {
  patternInstances,
  completedPatterns,
  validatePatternConfig,
  buildPatternCard,
} from "../shared/scratch/pattern";
import type { RandInt } from "../shared/scratch/matchingNumbers";
import type {
  MatchingGroupConfig,
  PatternConfig,
  PatternId,
} from "../shared/scratch/types";

const rand: RandInt = (min, max) => min + Math.floor(Math.random() * (max - min));

const setEq = (a: number[], b: number[]): boolean => {
  if (a.length !== b.length) return false;
  const sb = new Set(b);
  return a.every(x => sb.has(x));
};

describe("matchingGroup", () => {
  // positions 9 / requiredMatches 3 requires ceil(9/(3-1)) = 5 distinct keys to
  // represent a loss without an accidental win (4 keys x 2 max = 8 < 9 cells).
  const config: MatchingGroupConfig = {
    pool: ["a", "b", "c", "d", "e"],
    positions: 9,
    requiredMatches: 3,
  };

  it("accepts a sane config", () => {
    expect(validateGroupConfig(config)).toBeNull();
  });

  it("rejects a config whose pool can't represent a loss", () => {
    // 4 distinct keys, capped at 2 each, cannot fill 9 cells win-free.
    expect(
      validateGroupConfig({ pool: ["a", "b", "c", "d"], positions: 9, requiredMatches: 3 })
    ).not.toBeNull();
  });

  it("rejects requiredMatches > positions", () => {
    expect(
      validateGroupConfig({ pool: ["a", "b", "c", "d"], positions: 3, requiredMatches: 4 })
    ).not.toBeNull();
  });

  it("rejects a pool too small to represent losses", () => {
    // positions 9, requiredMatches 3 -> need ceil(9/2) = 5 distinct keys.
    expect(
      validateGroupConfig({ pool: ["a", "b", "c", "d"], positions: 10, requiredMatches: 2 })
    ).not.toBeNull();
  });

  for (const targetMatches of [3, 4, 5]) {
    it(`builds WIN cards with exactly ${targetMatches} matches (300 trials)`, () => {
      for (let t = 0; t < 300; t++) {
        const { card, winningKey, winningCells } = buildGroupCard(
          config,
          { win: true, targetMatches },
          rand
        );
        expect(winningKey).not.toBeNull();
        const counts = countByKey(card.cells);
        expect(counts.get(winningKey as string)).toBe(targetMatches);
        for (const [key, count] of counts) {
          if (key !== winningKey) {
            expect(count).toBeLessThan(config.requiredMatches);
          }
        }
        expect(winningCells.length).toBe(targetMatches);
        for (const idx of winningCells) {
          expect(card.cells[idx]).toBe(winningKey);
        }
        // winningCells must be exactly the indices holding winningKey.
        const expected = card.cells
          .map((c, i) => (c === winningKey ? i : -1))
          .filter(i => i >= 0);
        expect(setEq(winningCells, expected)).toBe(true);
      }
    });
  }

  it("builds LOSE cards with no key reaching requiredMatches (300 trials)", () => {
    for (let t = 0; t < 300; t++) {
      const { card, winningKey, winningCells } = buildGroupCard(
        config,
        { win: false },
        rand
      );
      expect(winningKey).toBeNull();
      expect(winningCells).toEqual([]);
      const counts = countByKey(card.cells);
      let max = 0;
      for (const count of counts.values()) max = Math.max(max, count);
      expect(max).toBeLessThan(config.requiredMatches);
      expect(card.cells.length).toBe(config.positions);
    }
  });
});

describe("pattern", () => {
  const config: PatternConfig = {
    gridSize: 3,
    pool: ["★", "●", "▲", "◆"],
    patterns: ["row", "col", "diag", "x", "corners"],
  };

  it("accepts a sane config", () => {
    expect(
      validatePatternConfig({
        gridSize: 3,
        pool: ["★", "●", "▲", "◆"],
        patterns: ["row", "col", "diag", "corners"],
      })
    ).toBeNull();
  });

  it("rejects X combined with corners/diagonal (X already covers them)", () => {
    expect(
      validatePatternConfig({ gridSize: 3, pool: ["★", "●", "▲"], patterns: ["x", "corners"] })
    ).toBeTruthy();
    expect(
      validatePatternConfig({ gridSize: 3, pool: ["★", "●", "▲"], patterns: ["x", "diag"] })
    ).toBeTruthy();
    // X alone is fine.
    expect(
      validatePatternConfig({ gridSize: 3, pool: ["★", "●", "▲"], patterns: ["row", "x"] })
    ).toBeNull();
  });

  it("patternInstances('x',3) has length 5", () => {
    const insts = patternInstances("x", 3);
    expect(insts.length).toBe(1);
    expect(insts[0].length).toBe(5);
  });

  it("patternInstances('corners',3) === [0,2,6,8]", () => {
    expect(patternInstances("corners", 3)).toEqual([[0, 2, 6, 8]]);
  });

  // "x" (cells {0,2,4,6,8}) strictly contains both "corners" ({0,2,6,8}) and
  // "diag" ({0,4,8}); making X monochrome necessarily makes those monochrome
  // too, so a SOLE X-win is impossible while corners/diag are enabled. The
  // engine surfaces this as a throw. Feasible sole-winners are the rest.
  const feasibleWinners: PatternId[] = ["row", "col", "diag", "corners"];

  it("builds WIN cards with exactly one completed pattern (300 trials)", () => {
    for (let t = 0; t < 300; t++) {
      const winningPattern = feasibleWinners[rand(0, feasibleWinners.length)];
      const { card, winningPattern: got, winningCells } = buildPatternCard(
        config,
        { win: true, winningPattern },
        rand
      );
      expect(got).toBe(winningPattern);
      const done = completedPatterns(card, config.patterns);
      expect(done.length).toBe(1);
      expect(setEq(done[0].cells, winningCells)).toBe(true);
    }
  });

  it("builds WIN cards for each feasible pattern (300 trials)", () => {
    for (let t = 0; t < 300; t++) {
      const winningPattern = feasibleWinners[rand(0, feasibleWinners.length)];
      const { card, winningCells } = buildPatternCard(
        config,
        { win: true, winningPattern },
        rand
      );
      const done = completedPatterns(card, config.patterns);
      expect(done.length).toBe(1);
      expect(setEq(done[0].cells, winningCells)).toBe(true);
    }
  });

  it("throws for an infeasible sole-winner (x contains corners/diag)", () => {
    expect(() =>
      buildPatternCard(config, { win: true, winningPattern: "x" }, rand)
    ).toThrow();
  });

  it("builds LOSE cards with no completed pattern (300 trials)", () => {
    for (let t = 0; t < 300; t++) {
      const { card, winningPattern, winningCells } = buildPatternCard(
        config,
        { win: false },
        rand
      );
      expect(winningPattern).toBeNull();
      expect(winningCells).toEqual([]);
      expect(completedPatterns(card, config.patterns).length).toBe(0);
    }
  });
});
