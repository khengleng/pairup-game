import { describe, it, expect } from "vitest";
import {
  rollDice,
  rollKlaklok,
  classifyKlaklok,
  scoreKlaklokBet,
  KLAKLOK_SYMBOLS,
  type Rng,
} from "@shared/shakeLogic";

/** Deterministic RNG that yields the given values in sequence, then repeats. */
function seq(values: number[]): Rng {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("rollDice", () => {
  it("produces pip values in 1–6", () => {
    for (let i = 0; i < 500; i++) {
      const roll = rollDice();
      expect(roll.dice).toHaveLength(2);
      for (const d of roll.dice) {
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(6);
      }
      expect(roll.total).toBe(roll.dice[0] + roll.dice[1]);
    }
  });

  it("maps rng extremes to 1 and 6", () => {
    expect(rollDice(seq([0, 0])).dice).toEqual([1, 1]);
    expect(rollDice(seq([0.999, 0.999])).dice).toEqual([6, 6]);
  });

  it("flags doubles", () => {
    expect(rollDice(seq([0.1, 0.1])).isDoubles).toBe(true); // [1,1]
    expect(rollDice(seq([0.1, 0.9])).isDoubles).toBe(false); // [1,6]
  });
});

describe("classifyKlaklok", () => {
  it("detects a triple", () => {
    expect(classifyKlaklok(["fish", "fish", "fish"])).toBe("triple");
  });
  it("detects a pair", () => {
    expect(classifyKlaklok(["fish", "crab", "fish"])).toBe("pair");
  });
  it("detects all-different", () => {
    expect(classifyKlaklok(["fish", "crab", "tiger"])).toBe("single");
  });
});

describe("rollKlaklok", () => {
  it("returns three valid symbol ids", () => {
    const validIds = new Set(KLAKLOK_SYMBOLS.map(s => s.id));
    for (let i = 0; i < 500; i++) {
      const roll = rollKlaklok();
      expect(roll.symbols).toHaveLength(3);
      for (const s of roll.symbols) expect(validIds.has(s)).toBe(true);
    }
  });

  it("scores a triple higher than a pair, and a pair higher than a single", () => {
    const triple = rollKlaklok(seq([0, 0, 0]));
    const pair = rollKlaklok(seq([0, 0, 0.999]));
    const single = rollKlaklok(seq([0, 0.2, 0.5]));
    expect(triple.match).toBe("triple");
    expect(pair.match).toBe("pair");
    expect(single.match).toBe("single");
    expect(triple.score).toBeGreaterThan(pair.score);
    expect(pair.score).toBeGreaterThan(single.score);
  });
});

describe("scoreKlaklokBet", () => {
  it("loses the stake when the pick misses", () => {
    const bet = scoreKlaklokBet(["tiger", "crab", "gourd"], "fish", 10);
    expect(bet.count).toBe(0);
    expect(bet.multiplier).toBe(0);
    expect(bet.net).toBe(-10);
    expect(bet.isJackpot).toBe(false);
  });

  it("pays 1× when the pick lands once", () => {
    const bet = scoreKlaklokBet(["fish", "crab", "gourd"], "fish", 10);
    expect(bet.count).toBe(1);
    expect(bet.net).toBe(10);
  });

  it("pays 2× on a pair", () => {
    const bet = scoreKlaklokBet(["fish", "fish", "gourd"], "fish", 25);
    expect(bet.count).toBe(2);
    expect(bet.net).toBe(50);
    expect(bet.isJackpot).toBe(false);
  });

  it("pays 3× and flags a jackpot on a triple", () => {
    const bet = scoreKlaklokBet(["fish", "fish", "fish"], "fish", 5);
    expect(bet.count).toBe(3);
    expect(bet.net).toBe(15);
    expect(bet.isJackpot).toBe(true);
  });
});
