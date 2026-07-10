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
import {
  buildGroupCard,
  validateGroupConfig,
} from "@shared/scratch/matchingGroup";
import {
  buildPatternCard,
  validatePatternConfig,
} from "@shared/scratch/pattern";
import type {
  MatchingNumbersConfig,
  MatchingGroupConfig,
  PatternConfig,
  PatternId,
  ScratchGameType,
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
  gameType: ScratchGameType;
  /** Game-type-specific card payload; the client renders by gameType. */
  card: unknown;
  isWinner: boolean;
  prizeLabel: string | null;
  /** Reveal metadata (which cells/pattern/key won). */
  reveal: {
    winningCells?: number[];
    winningKey?: string | null;
    winningPattern?: PatternId | null;
    matchCount?: number;
    matchedNumbers?: number[];
    requiredMatches?: number;
  };
};

/** Validate a campaign's config against its game type. Returns null if valid. */
export function validateConfig(
  gameType: ScratchGameType,
  config: unknown
): string | null {
  switch (gameType) {
    case "matching_numbers":
      return validateMatchingNumbersConfig(config as MatchingNumbersConfig);
    case "matching_symbols":
    case "matching_amounts":
      return validateGroupConfig(config as MatchingGroupConfig);
    case "pattern":
      return validatePatternConfig(config as PatternConfig);
    default:
      return "Unknown game type.";
  }
}

type ChosenTier = {
  id: number;
  requiredMatches: number;
  matchKey: string | null;
  valueLabel: string;
};

/**
 * Build a card + outcome reflecting a pre-decided result, dispatching by game
 * type. `chosen` is the winning tier (or null for a loss).
 */
function buildCardAndOutcome(
  gameType: ScratchGameType,
  config: unknown,
  chosen: ChosenTier | null
): { card: unknown; outcome: ScratchOutcome; reveal: PlayResult["reveal"] } {
  const isWinner = !!chosen;
  const prizeTierId = chosen?.id ?? null;
  const rand = secureRandInt;

  if (gameType === "matching_numbers") {
    const cfg = config as MatchingNumbersConfig;
    const maxM = maxPossibleMatches(cfg);
    const target = isWinner
      ? Math.min(chosen!.requiredMatches, maxM)
      : secureRandInt(0, Math.max(0, cfg.requiredMatches - 1) + 1);
    const card = buildMatchingNumbersCard(cfg, target, rand);
    const matched = computeMatches(card);
    return {
      card,
      outcome: { isWinner, prizeTierId, matchCount: matched.length, matchedNumbers: matched },
      reveal: {
        matchCount: matched.length,
        matchedNumbers: matched,
        requiredMatches: cfg.requiredMatches,
      },
    };
  }

  if (gameType === "matching_symbols" || gameType === "matching_amounts") {
    const cfg = config as MatchingGroupConfig;
    // Amounts: the winning key is the tier's amount (matchKey). Symbols: any.
    const winningKey =
      gameType === "matching_amounts" ? chosen?.matchKey ?? undefined : undefined;
    const target = isWinner
      ? Math.min(chosen!.requiredMatches || cfg.requiredMatches, cfg.positions)
      : undefined;
    const built = buildGroupCard(
      cfg,
      { win: isWinner, winningKey, targetMatches: target },
      rand
    );
    return {
      card: built.card,
      outcome: {
        isWinner,
        prizeTierId,
        winningCells: built.winningCells,
        winningKey: built.winningKey,
        matchCount: built.winningCells.length,
      },
      reveal: {
        winningCells: built.winningCells,
        winningKey: built.winningKey,
        matchCount: built.winningCells.length,
        requiredMatches: cfg.requiredMatches,
      },
    };
  }

  // pattern
  const cfg = config as PatternConfig;
  const winningPattern = (chosen?.matchKey as PatternId | undefined) ?? undefined;
  const built = buildPatternCard(cfg, { win: isWinner, winningPattern }, rand);
  return {
    card: built.card,
    outcome: {
      isWinner,
      prizeTierId,
      winningCells: built.winningCells,
      winningPattern: built.winningPattern,
    },
    reveal: {
      winningCells: built.winningCells,
      winningPattern: built.winningPattern,
    },
  };
}

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

  const config = asObject<unknown>(campaign.config);
  if (validateConfig(campaign.gameType, config)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Campaign is misconfigured." });
  }

  return db.transaction(async tx => {
    // Lock the prize tiers so inventory can't be over-committed concurrently.
    const tiers = await tx
      .select()
      .from(scratchPrizeTiers)
      .where(eq(scratchPrizeTiers.campaignId, params.campaignId))
      .for("update");

    const winnable: (WinnableTier & { valueLabel: string; matchKey: string | null })[] =
      tiers
        .map(t => ({
          id: t.id,
          weight: t.weight,
          requiredMatches: t.requiredMatches,
          available: t.totalQty - t.reservedQty - t.claimedQty,
          valueLabel: t.valueLabel,
          matchKey: t.matchKey,
        }))
        .filter(t => t.available > 0);

    let isWinner = decideWin(campaign.winProbabilityBps) && winnable.length > 0;
    const picked = isWinner ? pickWeightedTier(winnable) : null;
    const chosen = picked ? winnable.find(t => t.id === picked.id) ?? null : null;
    if (!chosen) isWinner = false;

    const { card, outcome: baseOutcome, reveal } = buildCardAndOutcome(
      campaign.gameType,
      config,
      chosen
        ? {
            id: chosen.id,
            requiredMatches: chosen.requiredMatches,
            matchKey: chosen.matchKey,
            valueLabel: chosen.valueLabel,
          }
        : null
    );
    const outcome: ScratchOutcome = baseOutcome;
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
      gameType: campaign.gameType,
      card,
      isWinner,
      prizeLabel: chosen ? chosen.valueLabel : null,
      reveal,
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
  gameType: ScratchGameType;
  config: unknown;
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
  const configError = validateConfig(input.gameType, input.config);
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
    gameType: input.gameType,
    status: "draft",
    config: input.config as InsertScratchCampaign["config"],
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

/**
 * Whether a campaign is safe to make live: it needs a win chance, at least one
 * prize tier, and available inventory — otherwise players can only ever lose.
 */
export async function getCampaignReadiness(campaignId: number) {
  const db = await getDb();
  const checks = { hasWinChance: false, hasTier: false, hasInventory: false };
  if (!db) return { ready: false, checks };
  const [campaign] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, campaignId))
    .limit(1);
  if (!campaign) return { ready: false, checks };
  const tiers = await db
    .select()
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.campaignId, campaignId));
  checks.hasWinChance = campaign.winProbabilityBps > 0;
  checks.hasTier = tiers.length > 0;
  checks.hasInventory = tiers.some(
    t => t.totalQty - t.reservedQty - t.claimedQty > 0
  );
  return {
    ready: checks.hasWinChance && checks.hasTier && checks.hasInventory,
    checks,
  };
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

  // Guard: don't let a campaign go live if players could only ever lose.
  if (status === "active") {
    const { ready, checks } = await getCampaignReadiness(id);
    if (!ready) {
      const missing = [
        !checks.hasWinChance && "a win chance above 0%",
        !checks.hasTier && "at least one prize tier",
        !checks.hasInventory && "available prize inventory",
      ].filter(Boolean);
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Can't activate yet — this campaign needs ${missing.join(", ")}.`,
      });
    }
  }

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
    requiredMatches?: number;
    matchKey?: string;
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

  // Per-game-type tier validation.
  let requiredMatches = input.requiredMatches ?? 0;
  let matchKey: string | null = input.matchKey ?? null;
  const gt = campaign.gameType;

  if (gt === "matching_numbers") {
    const cfg = asObject<MatchingNumbersConfig>(campaign.config);
    const max = maxPossibleMatches(cfg);
    if (requiredMatches < cfg.requiredMatches || requiredMatches > max) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Required matches must be between ${cfg.requiredMatches} and ${max}.` });
    }
    matchKey = null;
  } else if (gt === "matching_symbols") {
    const cfg = asObject<MatchingGroupConfig>(campaign.config);
    if (requiredMatches < cfg.requiredMatches || requiredMatches > cfg.positions) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Required matches must be between ${cfg.requiredMatches} and ${cfg.positions}.` });
    }
    matchKey = null;
  } else if (gt === "matching_amounts") {
    const cfg = asObject<MatchingGroupConfig>(campaign.config);
    if (!matchKey || !cfg.pool.includes(matchKey)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `The winning amount must be one of: ${cfg.pool.join(", ")}.` });
    }
    requiredMatches = requiredMatches || cfg.requiredMatches;
    if (requiredMatches < cfg.requiredMatches || requiredMatches > cfg.positions) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `Required matches must be between ${cfg.requiredMatches} and ${cfg.positions}.` });
    }
  } else if (gt === "pattern") {
    const cfg = asObject<PatternConfig>(campaign.config);
    if (!matchKey || !cfg.patterns.includes(matchKey as PatternId)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `The winning pattern must be one of: ${cfg.patterns.join(", ")}.` });
    }
    requiredMatches = 0;
  }

  const res = await db.insert(scratchPrizeTiers).values({
    campaignId: input.campaignId,
    name: input.name,
    valueLabel: input.valueLabel,
    valueCents: input.valueCents ?? 0,
    requiredMatches,
    matchKey,
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

/** Edit a DRAFT campaign's rules/settings. Only drafts are editable. */
export async function updateCampaign(
  id: number,
  input: Partial<CreateCampaignInput>,
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const [before] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, id))
    .limit(1);
  if (!before) throw new TRPCError({ code: "NOT_FOUND" });
  if (before.status !== "draft") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only draft campaigns can be edited. Pause or clone a live one.",
    });
  }
  if (input.config) {
    const err = validateConfig(before.gameType, input.config);
    if (err) throw new TRPCError({ code: "BAD_REQUEST", message: err });
  }
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.config !== undefined) patch.config = input.config;
  if (input.winProbabilityBps !== undefined) patch.winProbabilityBps = input.winProbabilityBps;
  if (input.dailyPlayLimit !== undefined) patch.dailyPlayLimit = input.dailyPlayLimit;
  if (input.minAge !== undefined) patch.minAge = input.minAge;
  if (input.countries !== undefined) patch.countries = input.countries ?? null;
  if (input.termsUrl !== undefined) patch.termsUrl = input.termsUrl ?? null;
  if (input.expiresAt !== undefined) patch.expiresAt = input.expiresAt ?? null;
  await db.update(scratchCampaigns).set(patch).where(eq(scratchCampaigns.id, id));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "campaign.update",
    entity: "scratchCampaign",
    entityId: String(id),
    before: { name: before.name, config: before.config, winProbabilityBps: before.winProbabilityBps },
    after: patch,
    ip: actor.ip ?? null,
  });
  return { success: true };
}

/** Delete a DRAFT campaign and its tiers + vouchers. Live/ended are protected. */
export async function deleteCampaign(
  id: number,
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const [campaign] = await db
    .select()
    .from(scratchCampaigns)
    .where(eq(scratchCampaigns.id, id))
    .limit(1);
  if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
  if (campaign.status !== "draft") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only draft campaigns can be deleted. End a live campaign instead.",
    });
  }
  const tiers = await db
    .select({ id: scratchPrizeTiers.id })
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.campaignId, id));
  for (const t of tiers) {
    await db.delete(scratchVoucherCodes).where(eq(scratchVoucherCodes.prizeTierId, t.id));
  }
  await db.delete(scratchPrizeTiers).where(eq(scratchPrizeTiers.campaignId, id));
  await db.delete(scratchCampaigns).where(eq(scratchCampaigns.id, id));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "campaign.delete",
    entity: "scratchCampaign",
    entityId: String(id),
    before: { name: campaign.name, status: campaign.status },
    ip: actor.ip ?? null,
  });
  return { success: true };
}

/** Delete a prize tier (and its vouchers) — only if nothing has been won yet. */
export async function deletePrizeTier(
  id: number,
  actor: { id: number; role: string; ip?: string }
) {
  const db = await getDbOrThrow();
  const [tier] = await db
    .select()
    .from(scratchPrizeTiers)
    .where(eq(scratchPrizeTiers.id, id))
    .limit(1);
  if (!tier) throw new TRPCError({ code: "NOT_FOUND" });
  if (tier.claimedQty > 0 || tier.reservedQty > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Can't delete a tier that already has awarded or reserved prizes.",
    });
  }
  await db.delete(scratchVoucherCodes).where(eq(scratchVoucherCodes.prizeTierId, id));
  await db.delete(scratchPrizeTiers).where(eq(scratchPrizeTiers.id, id));
  await writeAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: "prizeTier.delete",
    entity: "scratchPrizeTier",
    entityId: String(id),
    before: { name: tier.name, valueLabel: tier.valueLabel },
    ip: actor.ip ?? null,
  });
  return { success: true };
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

  const checks = {
    hasWinChance: campaign.winProbabilityBps > 0,
    hasTier: tiersWithStock.length > 0,
    hasInventory: tiersWithStock.some(t => t.remaining > 0),
  };
  const readiness = {
    ready: checks.hasWinChance && checks.hasTier && checks.hasInventory,
    checks,
  };

  return {
    campaign,
    tiers: tiersWithStock,
    liability,
    readiness,
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
