/**
 * Daily-streak logic. Pure functions so they're easy to test.
 *
 * A "streak" is the number of consecutive UTC days a player has completed the
 * daily challenge. Playing on consecutive days increments it; skipping a day
 * resets it to 1; replaying the same day leaves it unchanged.
 */

/** Previous UTC day key for a "YYYY-MM-DD" string. */
export function previousDateKey(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export type StreakState = {
  streak: number;
  bestStreak: number;
  /** True when this completion advanced the streak to a new day. */
  advanced: boolean;
  /** True when the player already logged the daily today. */
  alreadyPlayedToday: boolean;
};

export function computeStreak(
  lastDailyDate: string | null,
  todayKey: string,
  currentStreak: number,
  bestStreak: number
): StreakState {
  if (lastDailyDate === todayKey) {
    return {
      streak: currentStreak,
      bestStreak,
      advanced: false,
      alreadyPlayedToday: true,
    };
  }

  const continued = lastDailyDate === previousDateKey(todayKey);
  const streak = continued ? currentStreak + 1 : 1;
  return {
    streak,
    bestStreak: Math.max(bestStreak, streak),
    advanced: true,
    alreadyPlayedToday: false,
  };
}
