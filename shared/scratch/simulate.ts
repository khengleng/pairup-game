export type SimTier = {
  id: number;
  weight: number; // relative pick weight (>0)
  totalQty: number; // starting inventory for the simulation
  valueCents: number; // prize value in minor units
};

export type SimReport = {
  runs: number;
  expectedWinRate: number; // winProbabilityBps/10000, 0..1
  actualWins: number;
  actualWinRate: number; // actualWins/runs, 0..1
  perTier: { id: number; wins: number; valueCents: number }[];
  maxExposureCents: number; // sum over tiers of totalQty*valueCents (full liability)
  awardedValueCents: number; // sum over tiers of wins*valueCents
  inventoryExhausted: boolean; // true if every tier hit 0 remaining during the run
  exhaustedAtRun: number | null; // 1-based run index at which the LAST unit of inventory was consumed, else null
};

const MAX_RUNS = 5_000_000;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

// rand: () => number in [0,1); defaults to Math.random. Injectable for deterministic tests.
export function simulateCampaign(params: {
  winProbabilityBps: number;
  tiers: SimTier[];
  runs: number;
  rand?: () => number;
}): SimReport {
  const rand = params.rand ?? Math.random;
  const runs = Math.max(0, Math.min(Math.floor(params.runs), MAX_RUNS));

  const expectedWinRate = clamp(params.winProbabilityBps, 0, 10000) / 10000;

  const tierCount = params.tiers.length;

  // Local, allocation-light state arrays (do not mutate the input array/objects).
  const ids = new Array<number>(tierCount);
  const weights = new Array<number>(tierCount);
  const values = new Array<number>(tierCount);
  const remaining = new Array<number>(tierCount);
  const wins = new Array<number>(tierCount);

  let maxExposureCents = 0;
  let totalRemaining = 0;

  for (let i = 0; i < tierCount; i++) {
    const tier = params.tiers[i]!;
    ids[i] = tier.id;
    weights[i] = tier.weight;
    values[i] = tier.valueCents;
    remaining[i] = tier.totalQty;
    wins[i] = 0;
    maxExposureCents += tier.totalQty * tier.valueCents;
    if (tier.totalQty > 0) totalRemaining += tier.totalQty;
  }

  let actualWins = 0;
  let exhaustedAtRun: number | null = null;

  for (let run = 0; run < runs; run++) {
    const winRoll = rand() < expectedWinRate;
    if (!winRoll) continue;
    if (totalRemaining <= 0) continue; // forced loss: no inventory anywhere

    // Compute total eligible weight (tiers with remaining > 0 and weight > 0).
    let totalWeight = 0;
    for (let i = 0; i < tierCount; i++) {
      if (remaining[i]! > 0 && weights[i]! > 0) {
        totalWeight += weights[i]!;
      }
    }
    if (totalWeight <= 0) continue; // no weighted-eligible tier -> forced loss

    // Weighted pick: draw r, walk eligible tiers subtracting weight until r < 0.
    let r = rand() * totalWeight;
    let picked = -1;
    for (let i = 0; i < tierCount; i++) {
      if (remaining[i]! > 0 && weights[i]! > 0) {
        r -= weights[i]!;
        if (r < 0) {
          picked = i;
          break;
        }
      }
    }
    // Floating-point guard: if nothing selected, fall back to last eligible tier.
    if (picked < 0) {
      for (let i = tierCount - 1; i >= 0; i--) {
        if (remaining[i]! > 0 && weights[i]! > 0) {
          picked = i;
          break;
        }
      }
    }
    if (picked < 0) continue;

    remaining[picked]! -= 1;
    wins[picked]! += 1;
    actualWins += 1;
    totalRemaining -= 1;

    if (totalRemaining === 0 && exhaustedAtRun === null) {
      exhaustedAtRun = run + 1; // 1-based run index
    }
  }

  const perTier = new Array<{ id: number; wins: number; valueCents: number }>(
    tierCount
  );
  let awardedValueCents = 0;
  for (let i = 0; i < tierCount; i++) {
    perTier[i] = { id: ids[i]!, wins: wins[i]!, valueCents: values[i]! };
    awardedValueCents += wins[i]! * values[i]!;
  }

  return {
    runs,
    expectedWinRate,
    actualWins,
    actualWinRate: runs > 0 ? actualWins / runs : 0,
    perTier,
    maxExposureCents,
    awardedValueCents,
    inventoryExhausted: exhaustedAtRun !== null,
    exhaustedAtRun,
  };
}
