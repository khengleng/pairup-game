/**
 * Rewards wallet + referral loop. Players earn a unified points balance across
 * games; inviting a friend rewards both. Awards are best-effort — a points
 * failure never breaks gameplay.
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { users, pointsLedger, referrals } from "../drizzle/schema";
import { getBotUsername } from "./telegram";

/** Points awarded for each action. */
export const POINTS = {
  memoryWin: 50,
  dailyWin: 100,
  walkGoal: 100,
  scratchWin: 100,
  referral: 200,
} as const;

/** Add (or remove) points and record it in the ledger. Never throws. */
export async function awardPoints(userId: number, delta: number, reason: string) {
  try {
    const db = await getDb();
    if (!db || !userId || delta === 0) return;
    await db
      .update(users)
      .set({ points: sql`${users.points} + ${delta}` })
      .where(eq(users.id, userId));
    await db.insert(pointsLedger).values({ userId, delta, reason });
  } catch (err) {
    console.error("[Rewards] awardPoints failed:", err);
  }
}

export async function getWallet(userId: number | null) {
  const botUsername = await getBotUsername();
  const referralLink =
    botUsername && userId
      ? `https://t.me/${botUsername}?startapp=ref${userId}`
      : null;

  const db = await getDb();
  if (!db || !userId) {
    return { identified: false, points: 0, ledger: [], referralCount: 0, referralLink };
  }
  const [me] = await db
    .select({ points: users.points })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const ledger = await db
    .select({ delta: pointsLedger.delta, reason: pointsLedger.reason, createdAt: pointsLedger.createdAt })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId))
    .orderBy(desc(pointsLedger.createdAt))
    .limit(20);
  const [refs] = await db
    .select({ n: sql<number>`count(*)` })
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  return {
    identified: true,
    points: me?.points ?? 0,
    ledger,
    referralCount: Number(refs?.n ?? 0),
    referralLink,
  };
}

/**
 * Link a newly-arrived player to their referrer (once), rewarding both.
 * Idempotent and self-referral-safe.
 */
export async function claimReferral(newUserId: number, referrerId: number) {
  const db = await getDb();
  if (!db) return { linked: false };
  if (!newUserId || !referrerId || newUserId === referrerId) return { linked: false };

  const [me] = await db
    .select({ referredBy: users.referredBy })
    .from(users)
    .where(eq(users.id, newUserId))
    .limit(1);
  if (!me || me.referredBy != null) return { linked: false };

  const [referrer] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, referrerId))
    .limit(1);
  if (!referrer) return { linked: false };

  // The unique constraint on referredId makes this the single source of truth.
  try {
    await db.insert(referrals).values({ referrerId, referredId: newUserId });
  } catch {
    return { linked: false }; // already referred
  }
  await db.update(users).set({ referredBy: referrerId }).where(eq(users.id, newUserId));
  await awardPoints(newUserId, POINTS.referral, "Joined via a friend's invite");
  await awardPoints(referrerId, POINTS.referral, "Invited a friend");
  return { linked: true };
}
