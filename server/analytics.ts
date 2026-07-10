/**
 * Cross-game analytics for the admin overview. Aggregates activity across every
 * game plus the rewards + scratch economy into a single KPI snapshot.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  users,
  games,
  scratchSessions,
  scratchPrizeTiers,
  scratchAwards,
  walkSessions,
  shakeStats,
  pointsLedger,
  referrals,
  leads,
} from "../drizzle/schema";

function startOfUtcDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function count(db: any, table: any, where?: any): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)` }).from(table).where(where);
  return Number(row?.n ?? 0);
}

export async function getOverview() {
  const db = await getDb();
  const empty = {
    players: 0,
    activeToday: 0,
    plays: { memory: 0, scratch: 0, shake: 0, walk: 0, total: 0 },
    scratch: {
      plays: 0,
      winners: 0,
      paidCents: 0,
      outstandingCents: 0,
      claims: { pending: 0, verification: 0, fulfilled: 0, other: 0 },
    },
    rewards: { pointsIssued: 0, referrals: 0 },
    leads: 0,
  };
  if (!db) return empty;

  const dayStart = startOfUtcDay();

  const [players, memory, scratchPlays, walk] = await Promise.all([
    count(db, users),
    count(db, games),
    count(db, scratchSessions),
    count(db, walkSessions),
  ]);

  const [shakeRow] = await db
    .select({ n: sql<number>`coalesce(sum(${shakeStats.totalRolls}),0)` })
    .from(shakeStats);
  const shake = Number(shakeRow?.n ?? 0);

  const scratchWinners = await count(
    db,
    scratchSessions,
    eq(scratchSessions.isWinner, true)
  );

  // Prize economy.
  const tiers = await db
    .select({
      claimedQty: scratchPrizeTiers.claimedQty,
      reservedQty: scratchPrizeTiers.reservedQty,
      valueCents: scratchPrizeTiers.valueCents,
    })
    .from(scratchPrizeTiers);
  const paidCents = tiers.reduce((s: number, t: any) => s + t.claimedQty * t.valueCents, 0);
  const outstandingCents = tiers.reduce((s: number, t: any) => s + t.reservedQty * t.valueCents, 0);

  // Claims by status.
  const claimRows = await db
    .select({ status: scratchAwards.status, n: sql<number>`count(*)` })
    .from(scratchAwards)
    .groupBy(scratchAwards.status);
  const claims = { pending: 0, verification: 0, fulfilled: 0, other: 0 };
  for (const r of claimRows) {
    const n = Number(r.n);
    if (r.status === "pending") claims.pending += n;
    else if (r.status === "verification") claims.verification += n;
    else if (r.status === "fulfilled") claims.fulfilled += n;
    else claims.other += n;
  }

  // Rewards.
  const [pts] = await db
    .select({ n: sql<number>`coalesce(sum(case when ${pointsLedger.delta} > 0 then ${pointsLedger.delta} else 0 end),0)` })
    .from(pointsLedger);
  const referralCount = await count(db, referrals);
  const leadCount = await count(db, leads);

  // Active today: distinct users seen across memory, scratch and walk today.
  const [memToday, scrToday, walkToday] = await Promise.all([
    db.select({ id: games.userId }).from(games).where(gte(games.createdAt, dayStart)),
    db.select({ id: scratchSessions.userId }).from(scratchSessions).where(gte(scratchSessions.createdAt, dayStart)),
    db.select({ id: walkSessions.userId }).from(walkSessions).where(gte(walkSessions.createdAt, dayStart)),
  ]);
  const activeSet = new Set<number>();
  for (const rows of [memToday, scrToday, walkToday]) {
    for (const r of rows) if (r.id != null) activeSet.add(r.id);
  }

  return {
    players,
    activeToday: activeSet.size,
    plays: {
      memory,
      scratch: scratchPlays,
      shake,
      walk,
      total: memory + scratchPlays + shake + walk,
    },
    scratch: {
      plays: scratchPlays,
      winners: scratchWinners,
      paidCents,
      outstandingCents,
      claims,
    },
    rewards: { pointsIssued: Number(pts?.n ?? 0), referrals: referralCount },
    leads: leadCount,
  };
}
