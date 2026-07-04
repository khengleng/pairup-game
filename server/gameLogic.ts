import { TRPCError } from "@trpc/server";
import { GRID_DIMENSIONS } from "@shared/gameConfig";

/**
 * Server-authoritative scoring / anti-cheat.
 *
 * The client can send anything, so a completion is only trusted after it clears
 * three physical checks the client cannot forge:
 *   1. Wall-clock floor  – the server-measured time since the game was created
 *      must be at least the minimum plausible solve time. This uses the server's
 *      own clock, so a scripted "instant" completion is rejected regardless of
 *      the numbers it claims.
 *   2. Move floor         – a perfect game is exactly `pairs` attempts; fewer is
 *      structurally impossible.
 *   3. Time normalization – the reported time is clamped into the physically
 *      plausible window [minTime, elapsed + grace] before it is recorded.
 *
 * Residual risk: a bot that actually waits the minimum time and submits a
 * perfect move count can still post a (very hard) score. Fully closing that
 * requires server-side board state / per-move validation — tracked as a
 * follow-up in docs/AUDIT.md (P0.1).
 */

/** Fastest a human can plausibly reveal, read, and match a single pair. */
export const MIN_SECONDS_PER_PAIR = 0.4;

/** Slack added to the server-measured elapsed time (clock skew, page load). */
export const COMPLETION_TIME_GRACE_SECONDS = 5;

export function getPairCount(gridSize: string): number {
  const dims = GRID_DIMENSIONS[gridSize as keyof typeof GRID_DIMENSIONS];
  if (!dims) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Invalid grid size: ${gridSize}`,
    });
  }
  return dims.total / 2;
}

export function minPlausibleSeconds(pairs: number): number {
  return Math.max(1, Math.ceil(pairs * MIN_SECONDS_PER_PAIR));
}

export type CompletionInput = {
  gridSize: string;
  moves: number;
  timeSeconds: number;
  /** Server-measured wall-clock seconds since the game row was created. */
  elapsedSeconds: number;
};

export type NormalizedCompletion = {
  moves: number;
  timeSeconds: number;
  totalScore: number;
};

export function validateAndNormalizeCompletion({
  gridSize,
  moves,
  timeSeconds,
  elapsedSeconds,
}: CompletionInput): NormalizedCompletion {
  const pairs = getPairCount(gridSize);
  const minTime = minPlausibleSeconds(pairs);

  // 1. Wall-clock floor — the strongest check, based on the server's clock.
  if (elapsedSeconds + COMPLETION_TIME_GRACE_SECONDS < minTime) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Completion rejected: finished faster than physically possible.",
    });
  }

  // 2. Move floor — a perfect game needs exactly `pairs` attempts.
  if (!Number.isInteger(moves) || moves < pairs) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Completion rejected: invalid move count.",
    });
  }

  // 3. Normalize the reported time into the plausible window.
  const maxTime = Math.ceil(elapsedSeconds) + COMPLETION_TIME_GRACE_SECONDS;
  const reported = Number.isFinite(timeSeconds) ? Math.round(timeSeconds) : maxTime;
  const normalizedTime = Math.min(Math.max(reported, minTime), maxTime);

  return {
    moves,
    timeSeconds: normalizedTime,
    totalScore: moves + normalizedTime,
  };
}
