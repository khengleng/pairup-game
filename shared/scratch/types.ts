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

/** The authoritative, server-decided result of a play. */
export type ScratchOutcome = {
  isWinner: boolean;
  matchCount: number;
  /** Player numbers that match a winning number. */
  matchedNumbers: number[];
  prizeTierId: number | null;
};
