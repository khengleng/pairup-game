/**
 * Scratch-card service: all DB access for the scratch platform, including the
 * integrity-critical play/complete transactions (result decided + signed
 * server-side, prize inventory reserved under row locks so nothing is ever
 * awarded beyond stock).
 */

import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  scratchCampaigns,
  scratchPrizeTiers,
  scratchVoucherCodes,
  scratchSessions,
  scratchAwards,
  auditLogs,
} from "../../drizzle/schema";
import type {
  ScratchCampaign,
  InsertScratchCampaign,
  InsertAuditLog,
} from "../../drizzle/schema";
import {
  buildMatchingNumbersCard,
  computeMatches,
  maxPossibleMatches,
  validateMatchingNumbersConfig,
} from "@shared/scratch/matchingNumbers";
import type {
  MatchingNumbersConfig,
  ScratchOutcome,
} from "@shared/scratch/types";
import { getDailyDateKey } from "@shared/gameConfig";
import {
  decideWin,
  pickWeightedTier,
  secureRandInt,
  signResult,
  verifyResult,
  generateNonce,
  generateClaimRef,
  type WinnableTier,
} from "./engine";

async function getDbOrThrow() {
  const db = await getDb();
  if (!db)
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  return db;
}

function insertId(result: unknown): number {
  return (
    (result as any)?.[0]?.insertId ?? (result as any)?.insertId ?? 0
  );
}

/**
 * JSON columns come back parsed on MySQL (mysql2) but as a string on some
 * engines/drivers (e.g. MariaDB). Coerce defensively so reads are portable.
 */
function asObject<T>(value: unknown): T {
  return typeof value === "string" ? (JSON.parse(value) as T) : (value as T);
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
}

/** Best-effort immutable audit write (never throws). */
export async function writeAudit(entry: Omit<InsertAuditLog, "id" | "createdAt">) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(auditLogs).values(entry);
  } catch (err) {
    console.error("[Audit] Failed to write audit log:", err);
  }
}

// ---------------------------------------------------------------------------
// Player-facing reads
// ---------------------------------------------------------------------------

/** Public view of a campaign — never exposes probability or inventory. */
function toPublicCampaign(c: ScratchCampaign) {
  return {
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    gameType: c.gameType,
    termsUrl: c.termsUrl,
    expiresAt: c.expiresAt,
  };
}

export async function listActiveCampaigns() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const rows = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.status, "active"))
    .orderBy(desc(scratchCampaigns.createdAt));
  return rows
    .filter(c => (!c.startsAt || c.startsAt <= now) && (!c.expiresAt || c.expiresAt >= now))
    .map(toPublicCampaign);
}

export async function getPublicCampaign(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [c] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, id))
    .limit(1);
  if (!c || c.status !== "active") return null;
  // Prize tiers, player-safe (labels + value only; never inventory internals).
  const tiers = await db
    .select()
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.campaignId, id))
    .orderBy(scratchPrizeTiers.sortOrder);
  return {
    ...toPublicCampaign(c),
    prizes: tiers.map(t => ({ name: t.name, valueLabel: t.valueLabel })),
  };
}

async function countPlaysToday(userId: number, campaignId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const dayStart = new Date(`${getDailyDateKey(new Date())}T00:00:00.000Z`);
  const rows = await db
    .select({ id: scratchSessions.id })
    .from(scratchSessions)
    .where(
      and(
        eq(scratchSessions.userId, userId),
        eq(scratchSessions.campaignId, campaignId),
        sql`${scratchSessions.createdAt} >= ${dayStart}`
      )
    );
  return rows.length;
}

// ---------------------------------------------------------------------------
// Play — the integrity-critical transaction
// ---------------------------------------------------------------------------

export type PlayResult = {
  sessionId: number;
  card: { winningNumbers: number[]; playerNumbers: number[] };
  isWinner: boolean;
  matchCount: number;
  matchedNumbers: number[];
  requiredMatches: number;
  prizeLabel: string | null;
};

export async function play(params: {
  campaignId: number;
  userId: number;
  playerName?: string;
  ip?: string;
  deviceHash?: string;
}): Promise<PlayResult> {
  const db = await getDbOrThrow();

  // Eligibility checks that don't need the lock.
  const [campaign] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, params.campaignId))
    .limit(1);
  if (!campaign || campaign.status !== "active") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not available." });
  }
  const now = new Date();
  if (
    (campaign.startsAt && campaign.startsAt > now) ||
    (campaign.expiresAt && campaign.expiresAt < now)
  ) {
    throw new TRPCError({ code: "FORBIDDEN", message: "This campaign isn't running right now." });
  }
  if (campaign.dailyPlayLimit > 0) {
    const played = await countPlaysToday(params.userId, params.campaignId);
    if (played >= campaign.dailyPlayLimit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You've reached today's play limit for this game.",
      });
    }
  }

  const config = asObject<MatchingNumbersConfig>(campaign.config);
  if (validateMatchingNumbersConfig(config)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campaign is misconfigured." });
  }

  return db.transaction(async tx => {
    // Lock the prize tiers so inventory can't be over-committed concurrently.
    const tiers = await tx
      .select()
      .from(scratchPrizeTiers)
      .where(eq(scratchPrizeTiers.campaignId, params.campaignId))
      .for("update");

    const winnable: (WinnableTier & { valueLabel: string })[] = tiers
      .map(t => ({
        id: t.id,
        weight: t.weight,
        requiredMatches: t.requiredMatches,
        available: t.totalQty - t.reservedQty - t.claimedQty,
        valueLabel: t.valueLabel,
      }))
      .filter(t => t.available > 0);

    let isWinner = decideWin(campaign.winProbabilityBps) && winnable.length > 0;
    const picked = isWinner ? pickWeightedTier(winnable) : null;
    const chosen = picked ? winnable.find(t => t.id === picked.id) ?? null : null;
    if (!chosen) isWinner = false;

    const maxM = maxPossibleMatches(config);
    let targetMatches: number;
    if (isWinner && chosen) {
      targetMatches = Math.min(chosen.requiredMatches, maxM);
    } else {
      // A loss shows fewer than the minimum winning matches (allows near-misses).
      const cap = Math.max(0, config.requiredMatches - 1);
      targetMatches = secureRandInt(0, cap + 1);
    }

    const card = buildMatchingNumbersCard(config, targetMatches, secureRandInt);
    const matched = computeMatches(card);
    const outcome: ScratchOutcome = {
      isWinner,
      matchCount: matched.length,
      matchedNumbers: matched,
      prizeTierId: isWinner && chosen ? chosen.id : null,
    };
    const nonce = generateNonce();
    const signature = signResult(nonce, outcome);

    const inserted = await tx.insert(scratchSessions).values({
      campaignId: params.campaignId,
      userId: params.userId,
      playerName: params.playerName ?? null,
      status: "created",
      isWinner,
      prizeTierId: outcome.prizeTierId,
      card,
      outcome,
      nonce,
      signature,
      ip: params.ip ?? null,
      deviceHash: params.deviceHash ?? null,
    });
    const sessionId = insertId(inserted);

    if (isWinner && chosen) {
      // Reserve inventory and, if any voucher codes exist, hold one.
      await tx
        .update(scratchPrizeTiers)
        .set({ reservedQty: sql`${scratchPrizeTiers.reservedQty} + 1` })
        .where(eq(scratchPrizeTiers.id, chosen.id));
      const [voucher] = await tx
        .select()
        .from(scratchVoucherCodes)
        .where(
          and(
            eq(scratchVoucherCodes.prizeTierId, chosen.id),
            eq(scratchVoucherCodes.status, "available")
          )
        )
        .limit(1)
        .for("update");
      if (voucher) {
        await tx
          .update(scratchVoucherCodes)
          .set({ status: "reserved", sessionId })
          .where(eq(scratchVoucherCodes.id, voucher.id));
      }
    }

    return {
      sessionId,
      card,
      isWinner,
      matchCount: outcome.matchCount,
      matchedNumbers: outcome.matchedNumbers,
      requiredMatches: config.requiredMatches,
      prizeLabel: chosen ? chosen.valueLabel : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Complete — finalize the award (idempotent, anti-replay)
// ---------------------------------------------------------------------------

export type CompleteResult = {
  isWinner: boolean;
  claimRef: string | null;
  prizeLabel: string | null;
  voucherCode: string | null;
  status: string | null;
};

export async function complete(params: {
  sessionId: number;
  userId: number;
}): Promise<CompleteResult> {
  const db = await getDbOrThrow();

  return db.transaction(async tx => {
    const [session] = await tx
      .select()
      .from(scratchSessions)
      .where(eq(scratchSessions.id, params.sessionId))
      .limit(1)
      .for("update");
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });
    if (session.userId && session.userId !== params.userId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const outcome = asObject<ScratchOutcome>(session.outcome);
    // Defense-in-depth: the stored result must still verify against its nonce.
    if (!verifyResult(session.nonce, outcome, session.signature)) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Result integrity check failed." });
    }

    // Idempotent: if already completed, return the existing award.
    if (session.status === "completed") {
      const existing = await loadAwardSummary(tx, session.id);
      return existing;
    }

    await tx
      .update(scratchSessions)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(scratchSessions.id, session.id));

    if (!session.isWinner || !session.prizeTierId) {
      return { isWinner: false, claimRef: null, prizeLabel: null, voucherCode: null, status: null };
    }

    const [tier] = await tx
      .select()
      .from(scratchPrizeTiers)
      .where(eq(scratchPrizeTiers.id, session.prizeTierId))
      .limit(1)
      .for("update");

    const [voucher] = await tx
      .select()
      .from(scratchVoucherCodes)
      .where(
        and(
          eq(scratchVoucherCodes.sessionId, session.id),
          eq(scratchVoucherCodes.status, "reserved")
        )
      )
      .limit(1)
      .for("update");

    if (voucher) {
      await tx
        .update(scratchVoucherCodes)
        .set({ status: "claimed" })
        .where(eq(scratchVoucherCodes.id, voucher.id));
    }
    await tx
      .update(scratchPrizeTiers)
      .set({
        reservedQty: sql`GREATEST(${scratchPrizeTiers.reservedQty} - 1, 0)`,
        claimedQty: sql`${scratchPrizeTiers.claimedQty} + 1`,
      })
      .where(eq(scratchPrizeTiers.id, session.prizeTierId));

    const claimRef = generateClaimRef();
    // A delivered voucher code is fulfilled; otherwise it awaits manual fulfilment.
    const status = voucher ? "fulfilled" : "pending";
    await tx.insert(scratchAwards).values({
      sessionId: session.id,
      campaignId: session.campaignId,
      userId: params.userId,
      prizeTierId: session.prizeTierId,
      voucherCodeId: voucher?.id ?? null,
      claimRef,
      status,
    });

    return {
      isWinner: true,
      claimRef,
      prizeLabel: tier?.valueLabel ?? null,
      voucherCode: voucher?.code ?? null,
      status,
    };
  });
}

async function loadAwardSummary(tx: any, sessionId: number): Promise<CompleteResult> {
  const [award] = await tx
    .select()
    .from(scratchAwards)
    .where(eq(scratchAwards.sessionId, sessionId))
    .limit(1);
  if (!award) {
    return { isWinner: false, claimRef: null, prizeLabel: null, voucherCode: null, status: null };
  }
  const [tier] = await tx
    .select()
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.id, award.prizeTierId))
    .limit(1);
  let voucherCode: string | null = null;
  if (award.voucherCodeId) {
    const [v] = await tx
      .select()
      .from(scratchVoucherCodes)
      .where(eq(scratchVoucherCodes.id, award.voucherCodeId))
      .limit(1);
    voucherCode = v?.code ?? null;
  }
  return {
    isWinner: true,
    claimRef: award.claimRef,
    prizeLabel: tier?.valueLabel ?? null,
    voucherCode,
    status: award.status,
  };
}

export async function getPlayerHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: scratchSessions.id,
      campaignId: scratchSessions.campaignId,
      isWinner: scratchSessions.isWinner,
      status: scratchSessions.status,
      createdAt: scratchSessions.createdAt,
      campaignName: scratchCampaigns.name,
    })
    .from(scratchSessions)
    .leftJoin(scratchCampaigns, eq(scratchCampaigns.id, scratchSessions.campaignId))
    .where(eq(scratchSessions.userId, userId))
    .orderBy(desc(scratchSessions.createdAt))
    .limit(limit);
  return rows;
}

export async function getPlayerAwards(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      claimRef: scratchAwards.claimRef,
      status: scratchAwards.status,
      createdAt: scratchAwards.createdAt,
      prizeLabel: scratchPrizeTiers.valueLabel,
      campaignName: scratchCampaigns.name,
    })
    .from(scratchAwards)
    .leftJoin(scratchPrizeTiers, eq(scratchPrizeTiers.id, scratchAwards.prizeTierId))
    .leftJoin(scratchCampaigns, eq(scratchCampaigns.id, scratchAwards.campaignId))
    .where(eq(scratchAwards.userId, userId))
    .orderBy(desc(scratchAwards.createdAt))
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export type CreateCampaignInput = {
  name: string;
  description?: string;
  config: MatchingNumbersConfig;
  winProbabilityBps: number;
  dailyPlayLimit?: number;
  minAge?: number;
  countries?: string;
  termsUrl?: string;
  startsAt?: Date;
  expiresAt?: Date;
};

export async function createCampaign(
  input: CreateCampaignInput,
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const configError = validateMatchingNumbersConfig(input.config);
  if (configError) {
    throw new TRPCError({ code: "BAD_REQUEST", message: configError });
  }
  let slug = slugify(input.name) || `campaign-${Date.now()}`;
  // Ensure slug uniqueness.
  const existing = await db
    .select({ id: scratchCampaigns.id })
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.slug, slug))
    .limit(1);
  if (existing.length > 0) slug = `${slug}-${secureRandInt(1000, 9999)}`;

  const values: InsertScratchCampaign = {
    slug,
    name: input.name,
    description: input.description ?? null,
    gameType: "matching_numbers",
    status: "draft",
    config: input.config,
    winProbabilityBps: input.winProbabilityBps,
    dailyPlayLimit: input.dailyPlayLimit ?? 0,
    minAge: input.minAge ?? 0,
    countries: input.countries ?? null,
    termsUrl: input.termsUrl ?? null,
    startsAt: input.startsAt ?? null,
    expiresAt: input.expiresAt ?? null,
    createdBy: actor.id,
  };
  const res = await db.insert(scratchCampaigns).values(values);
  const id = insertId(res);
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "campaign.create",
    entity: "scratchCampaign",
    entityId: String(id),
    after: values,
    ip: actor.ip ?? null,
  });
  return { id, slug };
}

export async function setCampaignStatus(
  id: number,
  status: "draft" | "active" | "paused" | "ended",
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const [before] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, id))
    .limit(1);
  if (!before) throw new TRPCError({ code: "NOT_FOUND" });
  await db
    .update(scratchCampaigns)
    .set({ status })
    .where(eq(scratchCampaigns.id, id));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "campaign.status",
    entity: "scratchCampaign",
    entityId: String(id),
    before: { status: before.status },
    after: { status },
    ip: actor.ip ?? null,
  });
  return { success: true };
}

export async function createPrizeTier(
  input: {
    campaignId: number;
    name: string;
    valueLabel: string;
    valueCents?: number;
    requiredMatches: number;
    totalQty: number;
    weight?: number;
    sortOrder?: number;
  },
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const [campaign] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, input.campaignId))
    .limit(1);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND", message: "Campaign not found." });
  const config = asObject<MatchingNumbersConfig>(campaign.config);
  if (input.requiredMatches > maxPossibleMatches(config) || input.requiredMatches < config.requiredMatches) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Required matches must be between ${config.requiredMatches} and ${maxPossibleMatches(config)}.`,
    });
  }
  const res = await db.insert(scratchPrizeTiers).values({
    campaignId: input.campaignId,
    name: input.name,
    valueLabel: input.valueLabel,
    valueCents: input.valueCents ?? 0,
    requiredMatches: input.requiredMatches,
    totalQty: input.totalQty,
    weight: input.weight ?? 1,
    sortOrder: input.sortOrder ?? 0,
  });
  const id = insertId(res);
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "prizeTier.create",
    entity: "scratchPrizeTier",
    entityId: String(id),
    after: { ...input },
    ip: actor.ip ?? null,
  });
  return { id };
}

export async function addVoucherCodes(
  prizeTierId: number,
  codes: string[],
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const clean = Array.from(
    new Set(codes.map(c => c.trim()).filter(Boolean))
  );
  if (clean.length === 0) return { added: 0 };
  await db
    .insert(scratchVoucherCodes)
    .values(clean.map(code => ({ prizeTierId, code })));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "voucher.add",
    entity: "scratchPrizeTier",
    entityId: String(prizeTierId),
    after: { added: clean.length },
    ip: actor.ip ?? null,
  });
  return { added: clean.length };
}

export async function listCampaignsAdmin() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(scratchCampaigns)
    .orderBy(desc(scratchCampaigns.createdAt));
}

export async function getCampaignAdmin(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [campaign] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, id))
    .limit(1);
  if (!campaign) return null;
  const tiers = await db
    .select()
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.campaignId, id))
    .orderBy(scratchPrizeTiers.sortOrder);

  // Voucher counts per tier.
  const tiersWithStock = await Promise.all(
    tiers.map(async t => {
      const codes = await db
        .select({ status: scratchVoucherCodes.status })
        .from(scratchVoucherCodes)
        .where(eq(scratchVoucherCodes.prizeTierId, t.id));
      const available = codes.filter(c => c.status === "available").length;
      return {
        ...t,
        remaining: t.totalQty - t.reservedQty - t.claimedQty,
        voucherTotal: codes.length,
        voucherAvailable: available,
      };
    })
  );

  const liability = tiersWithStock.reduce(
    (acc, t) => {
      acc.claimedValueCents += t.claimedQty * t.valueCents;
      acc.reservedValueCents += t.reservedQty * t.valueCents;
      acc.maxExposureCents += t.totalQty * t.valueCents;
      return acc;
    },
    { claimedValueCents: 0, reservedValueCents: 0, maxExposureCents: 0 }
  );

  const [plays] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scratchSessions)
    .where(eq(scratchSessions.campaignId, id));
  const [winners] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scratchSessions)
    .where(and(eq(scratchSessions.campaignId, id), eq(scratchSessions.isWinner, true)));

  return {
    campaign,
    tiers: tiersWithStock,
    liability,
    plays: Number(plays?.count ?? 0),
    winners: Number(winners?.count ?? 0),
  };
}

export async function listAudit(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
