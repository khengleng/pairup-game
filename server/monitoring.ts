/**
 * Lightweight, self-contained monitoring: a health/readiness probe, global
 * error capture with rate-limited owner alerts, and a scheduled prize-liability
 * alert. No external service required — alerts go through notifyOwner.
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { notifyOwner } from "./_core/notification";
import { scratchPrizeTiers, scratchAwards } from "../drizzle/schema";

const startedAt = Date.now();
const VERSION = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

// --- Health ---

export async function getHealth(): Promise<{
  ok: boolean;
  db: "ok" | "down" | "unconfigured";
  uptimeSec: number;
  version: string;
  time: string;
}> {
  let db: "ok" | "down" | "unconfigured" = "unconfigured";
  try {
    const conn = await getDb();
    if (conn) {
      await conn.execute(sql`select 1`);
      db = "ok";
    }
  } catch {
    db = "down";
  }
  return {
    ok: db !== "down",
    db,
    uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
    version: VERSION,
    time: new Date().toISOString(),
  };
}

// --- Error reporting (rate-limited) ---

const ALERT_COOLDOWN_MS = 10 * 60_000;
const MAX_ALERTS_PER_HOUR = 12;
const lastAlertByKey = new Map<string, number>();
let hourWindowStart = Date.now();
let alertsThisHour = 0;

export function reportError(context: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error(
    JSON.stringify({ level: "error", context, message, at: new Date().toISOString(), ...extra })
  );
  if (stack) console.error(stack);

  const now = Date.now();
  if (now - hourWindowStart > 3_600_000) {
    hourWindowStart = now;
    alertsThisHour = 0;
  }
  const key = `${context}:${message}`.slice(0, 140);
  const last = lastAlertByKey.get(key) ?? 0;
  if (now - last < ALERT_COOLDOWN_MS || alertsThisHour >= MAX_ALERTS_PER_HOUR) return;
  lastAlertByKey.set(key, now);
  alertsThisHour++;
  notifyOwner({
    title: `⚠️ Server error — ${context}`,
    content: `${message}\n\n${(stack ?? "").slice(0, 1500)}`,
  }).catch(() => {});
}

// --- Prize-liability alert ---

const LIABILITY_ALERT_CENTS = Number(process.env.LIABILITY_ALERT_CENTS) || 100_000; // $1,000 reserved
const DAILY_PAYOUT_ALERT_CENTS = Number(process.env.DAILY_PAYOUT_ALERT_CENTS) || 50_000; // $500/day
let lastLiabilityAlertDay = "";
let lastPayoutAlertDay = "";

function money(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function checkPrizeLiability() {
  try {
    const db = await getDb();
    if (!db) return;
    const day = new Date().toISOString().slice(0, 10);
    const dayStart = new Date(`${day}T00:00:00.000Z`);

    // Outstanding (reserved) prize liability across all tiers.
    const tiers = await db
      .select({ reserved: scratchPrizeTiers.reservedQty, value: scratchPrizeTiers.valueCents })
      .from(scratchPrizeTiers);
    const outstanding = tiers.reduce((s, t) => s + t.reserved * t.value, 0);

    if (outstanding >= LIABILITY_ALERT_CENTS && lastLiabilityAlertDay !== day) {
      lastLiabilityAlertDay = day;
      await notifyOwner({
        title: "💰 Prize liability threshold crossed",
        content: `Outstanding reserved prize liability is ${money(outstanding)} (alert at ${money(LIABILITY_ALERT_CENTS)}). Review campaigns and inventory.`,
      });
    }

    // Today's fulfilled payout.
    const [paid] = await db
      .select({ cents: sql<number>`coalesce(sum(${scratchPrizeTiers.valueCents}), 0)` })
      .from(scratchAwards)
      .leftJoin(scratchPrizeTiers, eq(scratchPrizeTiers.id, scratchAwards.prizeTierId))
      .where(and(eq(scratchAwards.status, "fulfilled"), gte(scratchAwards.updatedAt, dayStart)));
    const paidToday = Number(paid?.cents ?? 0);

    if (paidToday >= DAILY_PAYOUT_ALERT_CENTS && lastPayoutAlertDay !== day) {
      lastPayoutAlertDay = day;
      await notifyOwner({
        title: "💸 Daily payout threshold crossed",
        content: `Prizes fulfilled today total ${money(paidToday)} (alert at ${money(DAILY_PAYOUT_ALERT_CENTS)}).`,
      });
    }
  } catch (err) {
    reportError("liability-check", err);
  }
}

// --- Startup ---

const CHECK_INTERVAL_MS = 15 * 60_000;

export function startMonitoring() {
  // Global safety nets — alert, then let the platform restart on fatal errors.
  process.on("unhandledRejection", reason => {
    reportError("unhandledRejection", reason);
  });
  process.on("uncaughtException", err => {
    reportError("uncaughtException", err);
    // Give the alert a moment, then exit so Railway restarts a clean process.
    setTimeout(() => process.exit(1), 1500);
  });

  // Periodic prize-liability / payout check.
  setTimeout(() => {
    checkPrizeLiability();
    setInterval(checkPrizeLiability, CHECK_INTERVAL_MS);
  }, 30_000);
}
