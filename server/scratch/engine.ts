/**
 * Server-side scratch-card engine: cryptographically secure result generation
 * and signing. The browser NEVER decides win/lose — this module does, before
 * the player scratches, using crypto RNG (never Math.random).
 */

import crypto from "crypto";
import type { ScratchOutcome } from "@shared/scratch/types";

const SIGNING_SECRET =
  process.env.RESULT_SIGNING_SECRET ??
  process.env.JWT_SECRET ??
  "dev-scratch-signing-secret-change-me";

if (
  process.env.NODE_ENV === "production" &&
  !process.env.RESULT_SIGNING_SECRET
) {
  console.warn(
    "[Scratch] RESULT_SIGNING_SECRET is not set — result signatures use a weak fallback. Set it in Railway variables."
  );
}

/** Integer in [minInclusive, maxExclusive) from a CSPRNG. */
export function secureRandInt(
  minInclusive: number,
  maxExclusive: number
): number {
  if (maxExclusive <= minInclusive) return minInclusive;
  return crypto.randomInt(minInclusive, maxExclusive);
}

/** Decide a win against a probability expressed in basis points (0–10000). */
export function decideWin(winProbabilityBps: number): boolean {
  const bps = Math.max(0, Math.min(10000, Math.floor(winProbabilityBps)));
  return crypto.randomInt(0, 10000) < bps;
}

export type WinnableTier = {
  id: number;
  weight: number;
  requiredMatches: number;
  /** Remaining inventory (total − reserved − claimed). */
  available: number;
};

/**
 * Pick a prize tier among those with available inventory, weighted by `weight`.
 * Returns null if nothing is available (→ forced loss).
 */
export function pickWeightedTier(tiers: WinnableTier[]): WinnableTier | null {
  const eligible = tiers.filter(t => t.available > 0 && t.weight > 0);
  if (eligible.length === 0) return null;
  const total = eligible.reduce((sum, t) => sum + t.weight, 0);
  let roll = secureRandInt(0, total);
  for (const t of eligible) {
    roll -= t.weight;
    if (roll < 0) return t;
  }
  return eligible[eligible.length - 1];
}

/** Canonical string over the fields that must not be tampered with. */
function resultPayload(sessionKey: string, outcome: ScratchOutcome): string {
  return [
    sessionKey,
    outcome.isWinner ? "1" : "0",
    outcome.matchCount,
    outcome.prizeTierId ?? "",
  ].join("|");
}

/** HMAC-SHA256 signature (hex) binding a result to a session nonce. */
export function signResult(
  sessionKey: string,
  outcome: ScratchOutcome
): string {
  return crypto
    .createHmac("sha256", SIGNING_SECRET)
    .update(resultPayload(sessionKey, outcome))
    .digest("hex");
}

/** Timing-safe verification of a result signature. */
export function verifyResult(
  sessionKey: string,
  outcome: ScratchOutcome,
  signature: string
): boolean {
  const expected = signResult(sessionKey, outcome);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/** Human-friendly, unguessable claim reference, e.g. "SCR-7F3K9Q". */
export function generateClaimRef(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let ref = "";
  for (let i = 0; i < 8; i++) ref += alphabet[secureRandInt(0, alphabet.length)];
  return `SCR-${ref}`;
}
