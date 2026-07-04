import { TRPCError } from "@trpc/server";

/**
 * Walking-challenge scoring / anti-cheat.
 *
 * Steps are counted on the client (accelerometer), so they can't be fully
 * trusted. We clamp a reported count to what's physically possible for the
 * server-measured session duration — the same wall-clock approach used for game
 * scores. Good enough for engagement; not a substitute for a real fitness
 * provider if prizes are on the line.
 */

/** Default daily step goal; override with DAILY_STEP_GOAL. */
export const DEFAULT_DAILY_STEP_GOAL = 6000;

/** Even sprinting tops out around 4-5 steps/sec; cap generously. */
export const MAX_STEPS_PER_SECOND = 4.5;

/** Ignore trivially short sessions (accidental taps). */
export const MIN_SESSION_SECONDS = 3;

export function getDailyStepGoal(): number {
  const fromEnv = Number(process.env.DAILY_STEP_GOAL);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? Math.floor(fromEnv)
    : DEFAULT_DAILY_STEP_GOAL;
}

/**
 * Clamp reported steps into the physically plausible range for the session's
 * elapsed time. Throws only on structurally invalid input.
 */
export function validateWalkSteps(input: {
  steps: number;
  elapsedSeconds: number;
}): number {
  if (!Number.isFinite(input.steps) || input.steps < 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Invalid step count.",
    });
  }
  const elapsed = Math.max(0, input.elapsedSeconds);
  const maxSteps = Math.ceil((elapsed + 2) * MAX_STEPS_PER_SECOND);
  return Math.min(Math.round(input.steps), maxSteps);
}
