/**
 * Scratch platform operations & safety (Phase 3): claims/fulfilment, a fraud
 * signal engine, campaign reporting, and a no-DB probability simulator.
 */

import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  users,
  scratchCampaigns,
  scratchPrizeTiers,
  scratchSessions,
  scratchAwards,
  scratchVoucherCodes,
} from "../../drizzle/schema";
import { simulateCampaign, type SimTier } from "@shared/scratch/simulate";
import { writeAudit } from "./service";

type Actor = { id: number; role: string; ip?: string };

async function db_() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  return db;
}

// ---------------------------------------------------------------------------
// Claims & fulfilment
// ---------------------------------------------------------------------------

export type ClaimStatus =
  | "pending"
  | "verification"
  | "approved"
  | "fulfilled"
  | "rejected"
  | "expired"
  | "cancelled";

export async function listClaims(filter?: {
  status?: ClaimStatus;
  campaignId?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conds = [] as any[];
  if (filter?.status) conds.push(eq(scratchAwards.status, filter.status));
  if (filter?.campaignId) conds.push(eq(scratchAwards.campaignId, filter.campaignId));
  return db
    .select({
      id: scratchAwards.id,
      claimRef: scratchAwards.claimRef,
      status: scratchAwards.status,
      createdAt: scratchAwards.createdAt,
      userId: scratchAwards.userId,
      playerName: users.name,
      campaignName: scratchCampaigns.name,
      prizeLabel: scratchPrizeTiers.valueLabel,
      valueCents: scratchPrizeTiers.valueCents,
      voucherId: scratchAwards.voucherCodeId,
    })
    .from(scratchAwards)
    .leftJoin(users, eq(users.id, scratchAwards.userId))
    .leftJoin(scratchCampaigns, eq(scratchCampaigns.id, scratchAwards.campaignId))
    .leftJoin(scratchPrizeTiers, eq(scratchPrizeTiers.id, scratchAwards.prizeTierId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(scratchAwards.createdAt))
    .limit(filter?.limit ?? 200);
}

/** Move a claim through its workflow; releases inventory when voided. */
export async function updateClaimStatus(
  awardId: number,
  status: ClaimStatus,
  reason: string | undefined,
  actor: Actor
) {
  const db = await db_();
  return db.transaction(async tx => {
    const [award] = await tx
      .select()
      .from(scratchAwards)
      .where(eq(scratchAwards.id, awardId))
      .limit(1)
      .for("update");
    if (!award) throw new TRPCError({ code: "NOT_FOUND" });
    const before = award.status;

    // Voiding a claim returns the prize to inventory.
    const voiding =
      (status === "rejected" || status === "cancelled" || status === "expired") &&
      before !== "rejected" &&
      before !== "cancelled" &&
      before !== "expired";
    if (voiding) {
      await tx
        .update(scratchPrizeTiers)
        .set({ claimedQty: sql`GREATEST(${scratchPrizeTiers.claimedQty} - 1, 0)` })
        .where(eq(scratchPrizeTiers.id, award.prizeTierId));
      if (award.voucherCodeId) {
        await tx
          .update(scratchVoucherCodes)
          .set({ status: "available", sessionId: null })
          .where(eq(scratchVoucherCodes.id, award.voucherCodeId));
      }
    }

    await tx
      .update(scratchAwards)
      .set({ status })
      .where(eq(scratchAwards.id, awardId));

    await writeAudit({
      actorId: actor.id,
      actorRole: actor.role,
      action: "claim.status",
      entity: "scratchAward",
      entityId: String(awardId),
      before: { status: before },
      after: { status },
      reason: reason ?? null,
      ip: actor.ip ?? null,
    });
    return { success: true };
  });
}

// ---------------------------------------------------------------------------
// Fraud signals
// ---------------------------------------------------------------------------

const VELOCITY_WINDOW_MS = 60 * 60 * 1000;
const VELOCITY_THRESHOLD = 20;
const SHARED_IP_MIN_ACCOUNTS = 3;

export async function getFraudSignals() {
  const db = await getDb();
  if (!db) return { sharedDevices: [], sharedIps: [], highVelocity: [] };

  // Devices used by 2+ distinct accounts (Sybil farming of limited inventory).
  const deviceGroups = await db
    .select({
      key: scratchSessions.deviceHash,
      accounts: sql<number>`count(distinct ${scratchSessions.userId})`,
      plays: sql<number>`count(*)`,
    })
    .from(scratchSessions)
    .where(isNotNull(scratchSessions.deviceHash))
    .groupBy(scratchSessions.deviceHash)
    .having(sql`count(distinct ${scratchSessions.userId}) >= 2`)
    .orderBy(sql`count(distinct ${scratchSessions.userId}) desc`)
    .limit(50);

  // IPs shared by many accounts.
  const ipGroups = await db
    .select({
      key: scratchSessions.ip,
      accounts: sql<number>`count(distinct ${scratchSessions.userId})`,
      plays: sql<number>`count(*)`,
    })
    .from(scratchSessions)
    .where(isNotNull(scratchSessions.ip))
    .groupBy(scratchSessions.ip)
    .having(sql`count(distinct ${scratchSessions.userId}) >= ${SHARED_IP_MIN_ACCOUNTS}`)
    .orderBy(sql`count(distinct ${scratchSessions.userId}) desc`)
    .limit(50);

  // High play velocity in the last hour (bot automation).
  const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
  const velocity = await db
    .select({
      userId: scratchSessions.userId,
      plays: sql<number>`count(*)`,
    })
    .from(scratchSessions)
    .where(gte(scratchSessions.createdAt, since))
    .groupBy(scratchSessions.userId)
    .having(sql`count(*) >= ${VELOCITY_THRESHOLD}`)
    .orderBy(sql`count(*) desc`)
    .limit(50);

  // Attach the member accounts to each flagged device.
  const withMembers = await Promise.all(
    deviceGroups.map(async g => {
      const members = await db
        .select({ userId: scratchSessions.userId, name: users.name })
        .from(scratchSessions)
        .leftJoin(users, eq(users.id, scratchSessions.userId))
        .where(eq(scratchSessions.deviceHash, g.key as string))
        .groupBy(scratchSessions.userId, users.name)
        .limit(20);
      return {
        deviceHash: (g.key as string).slice(0, 12),
        accounts: Number(g.accounts),
        plays: Number(g.plays),
        members: members.map(m => ({ userId: m.userId, name: m.name })),
      };
    })
  );

  // Names for high-velocity players.
  const vUserIds = velocity.map(v => v.userId).filter((x): x is number => x != null);
  const vNames = vUserIds.length
    ? await db.select({ id: users.id, name: users.name, blocked: users.blocked }).from(users).where(inArray(users.id, vUserIds))
    : [];
  const nameById = new Map(vNames.map(u => [u.id, u]));

  return {
    sharedDevices: withMembers,
    sharedIps: ipGroups.map(g => ({
      ip: g.key as string,
      accounts: Number(g.accounts),
      plays: Number(g.plays),
    })),
    highVelocity: velocity.map(v => ({
      userId: v.userId,
      name: v.userId != null ? nameById.get(v.userId)?.name ?? null : null,
      blocked: v.userId != null ? nameById.get(v.userId)?.blocked ?? false : false,
      plays: Number(v.plays),
    })),
  };
}

export async function listBlockedUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, blockReason: users.blockReason })
    .from(users)
    .where(eq(users.blocked, true))
    .limit(200);
}

export async function setUserBlocked(
  userId: number,
  blocked: boolean,
  reason: string | undefined,
  actor: Actor
) {
  const db = await db_();
  await db
    .update(users)
    .set({ blocked, blockReason: blocked ? reason ?? "Flagged by fraud review" : null })
    .where(eq(users.id, userId));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: blocked ? "player.block" : "player.unblock",
    entity: "user",
    entityId: String(userId),
    reason: reason ?? null,
    ip: actor.ip ?? null,
  });
  return { success: true };
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export async function getCampaignReports() {
  const db = await getDb();
  if (!db) return [];
  const campaigns = await db.select().from(scratchCampaigns).orderBy(desc(scratchCampaigns.createdAt));

  return Promise.all(
    campaigns.map(async c => {
      const [plays] = await db
        .select({ n: sql<number>`count(*)` })
        .from(scratchSessions)
        .where(eq(scratchSessions.campaignId, c.id));
      const [winners] = await db
        .select({ n: sql<number>`count(*)` })
        .from(scratchSessions)
        .where(and(eq(scratchSessions.campaignId, c.id), eq(scratchSessions.isWinner, true)));
      const [fulfilled] = await db
        .select({ n: sql<number>`count(*)` })
        .from(scratchAwards)
        .where(and(eq(scratchAwards.campaignId, c.id), eq(scratchAwards.status, "fulfilled")));
      const tiers = await db
        .select()
        .from(scratchPrizeTiers)
        .where(eq(scratchPrizeTiers.campaignId, c.id));
      const exposure = tiers.reduce((s, t) => s + t.totalQty * t.valueCents, 0);
      const awarded = tiers.reduce((s, t) => s + t.claimedQty * t.valueCents, 0);
      const nPlays = Number(plays?.n ?? 0);
      const nWinners = Number(winners?.n ?? 0);
      return {
        id: c.id,
        name: c.name,
        gameType: c.gameType,
        status: c.status,
        plays: nPlays,
        winners: nWinners,
        winRate: nPlays > 0 ? nWinners / nPlays : 0,
        fulfilled: Number(fulfilled?.n ?? 0),
        redemptionRate: nWinners > 0 ? Number(fulfilled?.n ?? 0) / nWinners : 0,
        maxExposureCents: exposure,
        awardedValueCents: awarded,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// Simulation (never touches production inventory)
// ---------------------------------------------------------------------------

export async function runSimulation(campaignId: number, runs: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  const [campaign] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, campaignId))
    .limit(1);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
  const tiers = await db
    .select()
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.campaignId, campaignId));
  const simTiers: SimTier[] = tiers.map(t => ({
    id: t.id,
    weight: t.weight,
    totalQty: t.totalQty,
    valueCents: t.valueCents,
  }));
  const report = simulateCampaign({
    winProbabilityBps: campaign.winProbabilityBps,
    tiers: simTiers,
    runs,
  });
  // Label tiers for display.
  const labelById = new Map(tiers.map(t => [t.id, t.valueLabel]));
  return {
    ...report,
    perTier: report.perTier.map(pt => ({
      ...pt,
      label: labelById.get(pt.id) ?? `Tier ${pt.id}`,
    })),
  };
}
