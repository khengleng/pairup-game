import { createHash, randomInt, timingSafeEqual } from "crypto";

/**
 * Pure helpers for email verification codes. No I/O, so unit-testable.
 * The router persists only the SHA-256 hash of a code, never the code itself.
 */

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_VERIFICATION_ATTEMPTS = 5;

/** Cryptographically-random zero-padded 6-digit code. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Constant-time comparison of a submitted code against a stored hash. */
export function codeMatches(code: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const a = Buffer.from(hashCode(code), "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function isExpired(expiresAt: Date | null, now: number = Date.now()): boolean {
  return !expiresAt || now > expiresAt.getTime();
}

export function expiryFromNow(now: number = Date.now()): Date {
  return new Date(now + CODE_TTL_MS);
}

/** Verification email content. */
export function verificationEmail(code: string): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Your PairUp verification code: ${code}`;
  const text = `Your PairUp verification code is ${code}. It expires in 15 minutes. If you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
      <h1 style="font-size:20px;margin:0 0 8px">Verify your email</h1>
      <p style="margin:0 0 16px;color:#4b5563">Enter this code back in PairUp to confirm your entry:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 0;text-align:center;color:#7c3aed">${code}</div>
      <p style="margin:16px 0 0;font-size:13px;color:#6b7280">This code expires in 15 minutes. If you didn't request it, you can ignore this email.</p>
    </div>`;
  return { subject, html, text };
}
