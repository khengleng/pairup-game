/**
 * Pure card logic for Matching Symbols and Matching Prize Amounts.
 *
 * Both share the same mechanic: a win is `requiredMatches` (or more) identical
 * entries among `positions` scratch cells. The card is CONSTRUCTED to reflect a
 * result the server already decided — a WIN card contains exactly one over-
 * threshold key, a LOSE card contains none. The browser only reveals what the
 * server built; it never computes win/lose itself.
 */

import { type RandInt, shuffleInPlace } from "./matchingNumbers";
import type { MatchingGroupConfig, GroupCard } from "./types";

/** Count occurrences of each key in a list of cells. */
export function countByKey(cells: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const c of cells) counts.set(c, (counts.get(c) ?? 0) + 1);
  return counts;
}

/** Distinct entries of a pool, preserving first-seen order. */
function distinct(pool: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of pool) {
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

/** Validate a config; returns a human message or null if valid. */
export function validateGroupConfig(config: MatchingGroupConfig): string | null {
  const { pool, positions, requiredMatches } = config;
  if (!Number.isInteger(positions) || !Number.isInteger(requiredMatches)) {
    return "Positions and required matches must be whole numbers.";
  }
  if (positions < 3) return "Need at least 3 positions.";
  if (positions > 25) return "Too many positions (max 25).";
  if (requiredMatches < 2) return "Required matches must be at least 2.";
  if (requiredMatches > positions) {
    return "Required matches can't exceed the number of positions.";
  }
  const keys = distinct(pool);
  // Winning must be feasible: a winning key plus at least one other filler.
  if (keys.length < 2) return "Pool needs at least 2 distinct entries.";
  // A loss must be representable: every entry must be able to appear fewer than
  // requiredMatches times across all positions. Round-robin over distinct keys
  // caps each at requiredMatches-1, so we need enough distinct keys.
  const needed = Math.ceil(positions / (requiredMatches - 1));
  if (keys.length < needed) {
    return "Pool too small to represent losing cards without an accidental win.";
  }
  return null;
}

/**
 * Distribute `count` filler cells over `keys` round-robin. Each key receives at
 * most ceil(count/keys.length) copies, which validation guarantees stays below
 * requiredMatches. Returns a flat list of `count` cell values.
 */
function roundRobin(keys: string[], count: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push(keys[i % keys.length]);
  return out;
}

/**
 * Build a group card consistent with `opts.win`.
 *
 * WIN: `winningKey` appears exactly `targetMatches` times; every other key
 * appears < requiredMatches. LOSE: no key reaches requiredMatches.
 */
export function buildGroupCard(
  config: MatchingGroupConfig,
  opts: { win: boolean; winningKey?: string; targetMatches?: number },
  rand: RandInt
): { card: GroupCard; winningKey: string | null; winningCells: number[] } {
  const { pool, positions, requiredMatches } = config;
  const keys = distinct(pool);

  let cells: string[];
  let winningKey: string | null;

  if (opts.win) {
    winningKey = opts.winningKey ?? keys[rand(0, keys.length)];
    let targetMatches = opts.targetMatches ?? requiredMatches;
    // Clamp to the representable range.
    if (targetMatches < requiredMatches) targetMatches = requiredMatches;
    if (targetMatches > positions) targetMatches = positions;

    const nonWinning = keys.filter(k => k !== winningKey);
    const remaining = positions - targetMatches;
    const fillers = roundRobin(nonWinning, remaining);
    cells = [
      ...Array.from({ length: targetMatches }, () => winningKey as string),
      ...fillers,
    ];
  } else {
    winningKey = null;
    cells = roundRobin(keys, positions);
  }

  shuffleInPlace(cells, rand);

  const winningCells: number[] = [];
  if (winningKey !== null) {
    for (let i = 0; i < cells.length; i++) {
      if (cells[i] === winningKey) winningCells.push(i);
    }
  }

  return { card: { cells }, winningKey, winningCells };
}
