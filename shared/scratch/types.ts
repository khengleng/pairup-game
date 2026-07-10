/**
 * Shared scratch-card types (client + server).
 *
 * Phase 1 implements the "matching_numbers" game type; the others are declared
 * here so campaigns and the admin can reference them ahead of Phases 2+.
 */

export type ScratchGameType =
  | "matching_numbers"
  | "matching_symbols"
  | "pattern"
  | "matching_amounts";

export type ScratchCampaignStatus = "draft" | "active" | "paused" | "ended";

/** Rule parameters for the Matching Winning Numbers game. */
export type MatchingNumbersConfig = {
  /** How many winning numbers are revealed at the top of the card. */
  winningCount: number;
  /** How many player numbers the user scratches. */
  playerCount: number;
  /** Inclusive lower bound of the number pool. */
  minNumber: number;
  /** Inclusive upper bound of the number pool. */
  maxNumber: number;
  /** Fewest matches that can win anything (a prize tier may require more). */
  requiredMatches: number;
};

export type MatchingNumbersCard = {
  winningNumbers: number[];
  /** Player numbers in display order. */
  playerNumbers: number[];
};

// --- Matching Symbols & Matching Prize Amounts (same "N-of-a-kind" shape) ---

/** Rule params for Matching Symbols / Matching Prize Amounts. `pool` holds the
 * symbol ids (symbols) or amount labels (amounts) that can appear on a card. */
export type MatchingGroupConfig = {
  /** Symbol ids or amount labels that can appear. */
  pool: string[];
  /** Number of scratch positions on the card. */
  positions: number;
  /** How many identical entries are needed to win. */
  requiredMatches: number;
};

/** A grid/row of revealed entries (symbol ids or amount labels). */
export type GroupCard = { cells: string[] };

// --- Pattern Completion ---

export type PatternId = "row" | "col" | "diag" | "corners" | "x";

export type PatternConfig = {
  /** Grid side length (e.g. 3 → a 3×3 grid). */
  gridSize: number;
  /** Symbol ids that can fill cells. */
  pool: string[];
  /** Which pattern shapes are allowed to win. */
  patterns: PatternId[];
};

export type PatternCard = { grid: string[]; size: number };

/** Card payload is game-type specific; the client renders by `campaign.gameType`. */
export type ScratchCardData =
  | MatchingNumbersCard
  | GroupCard
  | PatternCard;

/**
 * The authoritative, server-decided result of a play. Only `isWinner` +
 * `prizeTierId` are load-bearing for awards; the rest drives the reveal UI and
 * varies by game type.
 */
export type ScratchOutcome = {
  isWinner: boolean;
  prizeTierId: number | null;
  /** Matches count (numbers/symbols/amounts) when relevant. */
  matchCount?: number;
  /** Player numbers that match (matching_numbers). */
  matchedNumbers?: number[];
  /** Cell indices to highlight as the win (symbols/amounts/pattern). */
  winningCells?: number[];
  /** The winning symbol id / amount label (symbols/amounts). */
  winningKey?: string | null;
  /** The pattern that completed (pattern). */
  winningPattern?: PatternId | null;
};
