import { describe, it, expect } from "vitest";
import {
  buildMatchingNumbersCard,
  computeMatches,
  validateMatchingNumbersConfig,
  maxPossibleMatches,
  type RandInt,
} from "@shared/scratch/matchingNumbers";
import {
  pickWeightedTier,
  signResult,
  verifyResult,
  generateClaimRef,
  decideWin,
  type WinnableTier,
} from "./scratch/engine";
import type { MatchingNumbersConfig, ScratchOutcome } from "@shared/scratch/types";

const CONFIG: MatchingNumbersConfig = {
  winningCount: 3,
  playerCount: 5,
  minNumber: 1,
  maxNumber: 30,
  requiredMatches: 2,
};

// Math.random-backed RandInt (fine for card *construction* in tests).
const rand: RandInt = (min, max) => min + Math.floor(Math.random() * (max - min));

describe("matching-numbers config validation", () => {
  it("accepts a sane config", () => {
    expect(validateMatchingNumbersConfig(CONFIG)).toBeNull();
  });
  it("rejects requiredMatches beyond the counts", () => {
    expect(
      validateMatchingNumbersConfig({ ...CONFIG, requiredMatches: 4 })
    ).toMatch(/required matches/i);
  });
  it("rejects winning numbers larger than the pool", () => {
    expect(
      validateMatchingNumbersConfig({ ...CONFIG, minNumber: 1, maxNumber: 2 })
    ).toBeTruthy();
  });
});

describe("buildMatchingNumbersCard", () => {
  it("produces exactly the requested number of matches", () => {
    for (let target = 0; target <= maxPossibleMatches(CONFIG); target++) {
      for (let trial = 0; trial < 200; trial++) {
        const card = buildMatchingNumbersCard(CONFIG, target, rand);
        expect(card.winningNumbers).toHaveLength(CONFIG.winningCount);
        expect(card.playerNumbers).toHaveLength(CONFIG.playerCount);
        expect(new Set(card.winningNumbers).size).toBe(CONFIG.winningCount);
        expect(new Set(card.playerNumbers).size).toBe(CONFIG.playerCount);
        expect(computeMatches(card)).toHaveLength(target);
      }
    }
  });
});

describe("weighted tier selection", () => {
  it("never picks a tier with no inventory", () => {
    const tiers: WinnableTier[] = [
      { id: 1, weight: 10, requiredMatches: 2, available: 0 },
      { id: 2, weight: 1, requiredMatches: 3, available: 5 },
    ];
    for (let i = 0; i < 100; i++) expect(pickWeightedTier(tiers)?.id).toBe(2);
  });
  it("returns null when nothing is available", () => {
    expect(
      pickWeightedTier([{ id: 1, weight: 5, requiredMatches: 2, available: 0 }])
    ).toBeNull();
  });
  it("respects weights roughly", () => {
    const tiers: WinnableTier[] = [
      { id: 1, weight: 9, requiredMatches: 1, available: 1000 },
      { id: 2, weight: 1, requiredMatches: 3, available: 1000 },
    ];
    let ones = 0;
    for (let i = 0; i < 2000; i++) if (pickWeightedTier(tiers)?.id === 1) ones++;
    expect(ones).toBeGreaterThan(1500); // ~90%
  });
});

describe("result signing", () => {
  const outcome: ScratchOutcome = {
    isWinner: true,
    matchCount: 2,
    matchedNumbers: [8, 17],
    prizeTierId: 3,
  };
  it("verifies a valid signature", () => {
    const sig = signResult("nonce-abc", outcome);
    expect(verifyResult("nonce-abc", outcome, sig)).toBe(true);
  });
  it("rejects a tampered outcome", () => {
    const sig = signResult("nonce-abc", outcome);
    expect(
      verifyResult("nonce-abc", { ...outcome, prizeTierId: 999 }, sig)
    ).toBe(false);
    expect(verifyResult("other-nonce", outcome, sig)).toBe(false);
  });
  it("rejects a garbage signature without throwing", () => {
    expect(verifyResult("nonce-abc", outcome, "deadbeef")).toBe(false);
  });
});

describe("claim references", () => {
  it("are unique-ish and well-formed", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const ref = generateClaimRef();
      expect(ref).toMatch(/^SCR-[A-Z0-9]{8}$/);
      seen.add(ref);
    }
    expect(seen.size).toBeGreaterThan(990);
  });
});

describe("decideWin", () => {
  it("never wins at 0 bps and always wins at 10000 bps", () => {
    for (let i = 0; i < 200; i++) {
      expect(decideWin(0)).toBe(false);
      expect(decideWin(10000)).toBe(true);
    }
  });
});
