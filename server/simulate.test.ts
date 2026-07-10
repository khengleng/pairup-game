import { describe, it, expect } from "vitest";
import {
  simulateCampaign,
  type SimTier,
} from "../shared/scratch/simulate";

// Small deterministic PRNG for stable, seedable tests.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("simulateCampaign", () => {
  it("always-win single tier exhausts inventory exactly", () => {
    const tiers: SimTier[] = [
      { id: 1, weight: 1, totalQty: 10, valueCents: 500 },
    ];
    const report = simulateCampaign({
      winProbabilityBps: 10000,
      tiers,
      runs: 100,
      rand: mulberry32(42),
    });

    expect(report.actualWins).toBe(10);
    expect(report.inventoryExhausted).toBe(true);
    expect(report.exhaustedAtRun).toBe(10);
    expect(report.awardedValueCents).toBe(10 * 500);
    expect(report.perTier[0]!.wins).toBe(10);
  });

  it("zero win probability produces no wins and no exhaustion", () => {
    const tiers: SimTier[] = [
      { id: 1, weight: 1, totalQty: 10, valueCents: 500 },
    ];
    const report = simulateCampaign({
      winProbabilityBps: 0,
      tiers,
      runs: 1000,
      rand: mulberry32(7),
    });

    expect(report.actualWins).toBe(0);
    expect(report.inventoryExhausted).toBe(false);
    expect(report.exhaustedAtRun).toBeNull();
    expect(report.awardedValueCents).toBe(0);
  });

  it("weighted split roughly follows tier weights", () => {
    const tiers: SimTier[] = [
      { id: 1, weight: 9, totalQty: 1_000_000, valueCents: 100 },
      { id: 2, weight: 1, totalQty: 1_000_000, valueCents: 100 },
    ];
    const report = simulateCampaign({
      winProbabilityBps: 10000,
      tiers,
      runs: 10000,
      rand: mulberry32(12345),
    });

    expect(report.actualWins).toBe(10000);
    const heavy = report.perTier.find((t) => t.id === 1)!;
    const share = heavy.wins / report.actualWins;
    expect(share).toBeGreaterThan(0.8);
  });

  it("maxExposureCents equals full liability regardless of runs", () => {
    const tiers: SimTier[] = [
      { id: 1, weight: 3, totalQty: 5, valueCents: 200 },
      { id: 2, weight: 1, totalQty: 8, valueCents: 1000 },
    ];
    const expected = 5 * 200 + 8 * 1000;

    const small = simulateCampaign({
      winProbabilityBps: 5000,
      tiers,
      runs: 3,
      rand: mulberry32(1),
    });
    const big = simulateCampaign({
      winProbabilityBps: 5000,
      tiers,
      runs: 50000,
      rand: mulberry32(1),
    });

    expect(small.maxExposureCents).toBe(expected);
    expect(big.maxExposureCents).toBe(expected);
  });

  it("is deterministic for the same seed and params", () => {
    const tiers: SimTier[] = [
      { id: 1, weight: 5, totalQty: 100, valueCents: 250 },
      { id: 2, weight: 2, totalQty: 40, valueCents: 999 },
      { id: 3, weight: 1, totalQty: 10, valueCents: 5000 },
    ];
    const make = () =>
      simulateCampaign({
        winProbabilityBps: 6000,
        tiers,
        runs: 5000,
        rand: mulberry32(99),
      });

    const a = make();
    const b = make();
    expect(a).toEqual(b);
  });
});
