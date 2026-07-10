/**
 * Pure card logic for Pattern Completion.
 *
 * A `gridSize`×`gridSize` grid of pool symbols. A WIN means exactly one enabled
 * pattern instance is monochrome (all its cells share one symbol) and NO other
 * enabled instance is monochrome. Cards are CONSTRUCTED to a server-decided
 * result: WIN builds a single intended monochrome instance, LOSE builds a grid
 * with none. The browser only reveals what the server built.
 */

import { type RandInt } from "./matchingNumbers";
import type { PatternConfig, PatternCard, PatternId } from "./types";

const PATTERN_IDS: readonly PatternId[] = [
  "row",
  "col",
  "diag",
  "corners",
  "x",
];

/** Concrete 0-based, row-major cell-index sets for a pattern id. */
export function patternInstances(id: PatternId, size: number): number[][] {
  switch (id) {
    case "row": {
      const out: number[][] = [];
      for (let r = 0; r < size; r++) {
        const cells: number[] = [];
        for (let c = 0; c < size; c++) cells.push(r * size + c);
        out.push(cells);
      }
      return out;
    }
    case "col": {
      const out: number[][] = [];
      for (let c = 0; c < size; c++) {
        const cells: number[] = [];
        for (let r = 0; r < size; r++) cells.push(r * size + c);
        out.push(cells);
      }
      return out;
    }
    case "diag": {
      const cells: number[] = [];
      for (let i = 0; i < size; i++) cells.push(i * size + i);
      return [cells];
    }
    case "x": {
      const seen = new Set<number>();
      const cells: number[] = [];
      for (let i = 0; i < size; i++) {
        const main = i * size + i;
        if (!seen.has(main)) {
          seen.add(main);
          cells.push(main);
        }
        const anti = i * size + (size - 1 - i);
        if (!seen.has(anti)) {
          seen.add(anti);
          cells.push(anti);
        }
      }
      return [cells];
    }
    case "corners": {
      if (size < 2) return [];
      return [[0, size - 1, size * (size - 1), size * size - 1]];
    }
  }
}

/** Flatten every instance of every enabled pattern. */
export function allEnabledInstances(
  config: PatternConfig
): { id: PatternId; cells: number[] }[] {
  const out: { id: PatternId; cells: number[] }[] = [];
  for (const id of config.patterns) {
    for (const cells of patternInstances(id, config.gridSize)) {
      out.push({ id, cells });
    }
  }
  return out;
}

/** Every enabled instance whose cells are all equal (monochrome). */
export function completedPatterns(
  card: PatternCard,
  patterns: PatternId[]
): { id: PatternId; cells: number[] }[] {
  const out: { id: PatternId; cells: number[] }[] = [];
  for (const id of patterns) {
    for (const cells of patternInstances(id, card.size)) {
      if (cells.length === 0) continue;
      const first = card.grid[cells[0]];
      if (cells.every(i => card.grid[i] === first)) out.push({ id, cells });
    }
  }
  return out;
}

/** Validate a config; returns a human message or null if valid. */
export function validatePatternConfig(config: PatternConfig): string | null {
  const { gridSize, pool, patterns } = config;
  if (!Number.isInteger(gridSize)) return "Grid size must be a whole number.";
  if (gridSize < 3) return "Grid size must be at least 3.";
  if (gridSize > 5) return "Grid size can be at most 5.";
  const distinctPool = new Set(pool).size;
  // Pool must be large enough to break unwanted monochrome lines.
  if (distinctPool < 3) return "Pool needs at least 3 distinct symbols.";
  if (patterns.length === 0) return "Enable at least one pattern.";
  for (const id of patterns) {
    if (!PATTERN_IDS.includes(id)) return `Unknown pattern: ${id}.`;
  }
  if (
    (patterns.includes("corners") ||
      patterns.includes("diag") ||
      patterns.includes("x")) &&
    gridSize < 2
  ) {
    return "Corners/diagonal patterns need a grid of at least 2.";
  }
  // The "x" (both diagonals) geometrically contains the corners and the main
  // diagonal, so a card that completes X necessarily completes those too —
  // they can't be independent winners. Disallow the combination.
  if (
    patterns.includes("x") &&
    (patterns.includes("corners") || patterns.includes("diag"))
  ) {
    return "The X pattern already covers the corners and the diagonal — remove X, or remove corners/diagonal.";
  }
  return null;
}

/**
 * Build a pattern card consistent with `opts.win`.
 *
 * WIN: exactly one enabled instance (the intended `winningPattern`) is
 * monochrome. LOSE: no enabled instance is monochrome. Throws if a valid config
 * somehow cannot be satisfied within the bounded retries (a real misconfig).
 */
export function buildPatternCard(
  config: PatternConfig,
  opts: { win: boolean; winningPattern?: PatternId },
  rand: RandInt
): { card: PatternCard; winningPattern: PatternId | null; winningCells: number[] } {
  const { gridSize, pool, patterns } = config;
  const distinctPool = Array.from(new Set(pool));
  const total = gridSize * gridSize;
  const MAX_RESTARTS = 200;
  const MAX_RETRIES = 50;

  const sameCells = (a: number[], b: number[]): boolean => {
    if (a.length !== b.length) return false;
    const sb = new Set(b);
    return a.every(i => sb.has(i));
  };

  // Enabled instances precomputed once for the incremental checks below.
  const enabled = allEnabledInstances(config);

  /**
   * Given the cells assigned so far, does the grid contain a monochrome enabled
   * instance that is "bad" (not the allowed one)? Only instances whose cells are
   * ALL assigned are considered, so partially-filled lines never false-trigger.
   * `allowed` is the intended winning instance (WIN) or null (LOSE = none
   * allowed).
   */
  const hasBadComplete = (
    grid: string[],
    assigned: boolean[],
    allowed: number[] | null
  ): boolean => {
    for (const { cells } of enabled) {
      if (!cells.every(i => assigned[i])) continue;
      const first = grid[cells[0]];
      if (!cells.every(i => grid[i] === first)) continue;
      // Monochrome and fully assigned.
      if (allowed === null) return true;
      if (!sameCells(cells, allowed)) return true;
    }
    return false;
  };

  const allowedInstance = (opts.win ? undefined : null) as number[] | null;

  if (opts.win) {
    const winningPattern =
      opts.winningPattern ?? patterns[rand(0, patterns.length)];
    const wInstances = patternInstances(winningPattern, gridSize);

    for (let restart = 0; restart < MAX_RESTARTS; restart++) {
      const instance = wInstances[rand(0, wInstances.length)];
      const symbolA = distinctPool[rand(0, distinctPool.length)];

      const grid: string[] = new Array(total).fill(symbolA);
      const assigned: boolean[] = new Array(total).fill(false);
      const fixed = new Set(instance);
      for (const idx of instance) assigned[idx] = true;

      let ok = true;
      for (let cell = 0; cell < total; cell++) {
        if (fixed.has(cell)) continue;
        let placed = false;
        for (let retry = 0; retry < MAX_RETRIES; retry++) {
          grid[cell] = distinctPool[rand(0, distinctPool.length)];
          assigned[cell] = true;
          if (!hasBadComplete(grid, assigned, instance)) {
            placed = true;
            break;
          }
          assigned[cell] = false;
        }
        if (!placed) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;

      const finalDone = completedPatterns({ grid, size: gridSize }, patterns);
      if (finalDone.length === 1 && sameCells(finalDone[0].cells, instance)) {
        return {
          card: { grid, size: gridSize },
          winningPattern,
          winningCells: [...instance],
        };
      }
    }
    throw new Error("Unable to build a winning pattern card for this config.");
  }

  // LOSE
  for (let restart = 0; restart < MAX_RESTARTS; restart++) {
    const grid: string[] = new Array(total).fill(distinctPool[0]);
    const assigned: boolean[] = new Array(total).fill(false);
    let ok = true;
    for (let cell = 0; cell < total; cell++) {
      let placed = false;
      for (let retry = 0; retry < MAX_RETRIES; retry++) {
        grid[cell] = distinctPool[rand(0, distinctPool.length)];
        assigned[cell] = true;
        if (!hasBadComplete(grid, assigned, allowedInstance)) {
          placed = true;
          break;
        }
        assigned[cell] = false;
      }
      if (!placed) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (completedPatterns({ grid, size: gridSize }, patterns).length === 0) {
      return {
        card: { grid, size: gridSize },
        winningPattern: null,
        winningCells: [],
      };
    }
  }
  throw new Error("Unable to build a losing pattern card for this config.");
}
