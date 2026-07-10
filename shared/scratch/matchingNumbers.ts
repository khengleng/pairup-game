/**
 * Pure card logic for the Matching Winning Numbers game.
 *
 * The card is CONSTRUCTED to reflect a result the server has already decided —
 * the number of matches it contains is chosen up front. The browser never
 * computes win/lose; it only reveals and highlights what the server built.
 */

import type { MatchingNumbersConfig, MatchingNumbersCard } from "./types";

/** Returns an integer in [minInclusive, maxExclusive). */
export type RandInt = (minInclusive: number, maxExclusive: number) => number;

/** Fisher–Yates in place using the supplied RNG. */
export function shuffleInPlace<T>(arr: T[], rand: RandInt): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rand(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Pick `k` distinct integers from `pool` (does not mutate `pool`). */
function sampleDistinct(pool: number[], k: number, rand: RandInt): number[] {
  const copy = [...pool];
  const out: number[] = [];
  for (let i = 0; i < k && copy.length > 0; i++) {
    const idx = rand(0, copy.length);
    out.push(copy[idx]);
    copy[idx] = copy[copy.length - 1];
    copy.pop();
  }
  return out;
}

function rangePool(min: number, max: number): number[] {
  const pool: number[] = [];
  for (let n = min; n <= max; n++) pool.push(n);
  return pool;
}

/** Validate a config; returns an error message or null if valid. */
export function validateMatchingNumbersConfig(
  config: MatchingNumbersConfig
): string | null {
  const { winningCount, playerCount, minNumber, maxNumber, requiredMatches } =
    config;
  if (![winningCount, playerCount, minNumber, maxNumber, requiredMatches].every(
    n => Number.isInteger(n)
  )) {
    return "All number settings must be whole numbers.";
  }
  if (minNumber > maxNumber) return "Min number must be ≤ max number.";
  const poolSize = maxNumber - minNumber + 1;
  if (winningCount < 1) return "Need at least one winning number.";
  if (playerCount < 1) return "Need at least one player number.";
  if (winningCount > poolSize)
    return "Winning numbers exceed the number range.";
  if (playerCount > poolSize) return "Player numbers exceed the number range.";
  if (requiredMatches < 1) return "Required matches must be at least 1.";
  if (requiredMatches > Math.min(winningCount, playerCount)) {
    return "Required matches can't exceed winning or player number counts.";
  }
  // A loss must be representable: there must be enough non-winning numbers to
  // fill the player row with fewer than requiredMatches matches.
  const nonWinning = poolSize - winningCount;
  if (nonWinning < playerCount - (requiredMatches - 1)) {
    return "Number range too small to represent losing cards.";
  }
  return null;
}

/** Largest match count the card can physically contain. */
export function maxPossibleMatches(config: MatchingNumbersConfig): number {
  return Math.min(config.winningCount, config.playerCount);
}

/**
 * Build a card that contains EXACTLY `targetMatches` matches.
 * Caller must pass a valid config (see validateMatchingNumbersConfig) and a
 * feasible targetMatches (0..maxPossibleMatches).
 */
export function buildMatchingNumbersCard(
  config: MatchingNumbersConfig,
  targetMatches: number,
  rand: RandInt
): MatchingNumbersCard {
  const pool = rangePool(config.minNumber, config.maxNumber);
  const winningNumbers = sampleDistinct(pool, config.winningCount, rand);
  const winningSet = new Set(winningNumbers);
  const nonWinningPool = pool.filter(n => !winningSet.has(n));

  const matches = sampleDistinct(winningNumbers, targetMatches, rand);
  const fillers = sampleDistinct(
    nonWinningPool,
    config.playerCount - targetMatches,
    rand
  );

  const playerNumbers = shuffleInPlace([...matches, ...fillers], rand);
  return { winningNumbers, playerNumbers };
}

/** Count/collect the matches actually present in a card. */
export function computeMatches(card: MatchingNumbersCard): number[] {
  const winning = new Set(card.winningNumbers);
  return card.playerNumbers.filter(n => winning.has(n));
}
