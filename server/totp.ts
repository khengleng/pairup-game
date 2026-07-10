/**
 * TOTP (RFC 6238) two-factor auth + AES-256-GCM secret encryption, implemented
 * with Node crypto (no external dependency). Secrets are stored encrypted at
 * rest with ENCRYPTION_KEY.
 */

import crypto from "crypto";

const ISSUER = "Cambobia Games";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

// --- Encryption at rest (AES-256-GCM) ---

function keyBuf(): Buffer {
  const src = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "dev-key";
  return crypto.createHash("sha256").update(src).digest(); // always 32 bytes
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyBuf(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), ct.toString("base64")].join(":");
}

export function decryptSecret(stored: string): string | null {
  try {
    const [ivb, tagb, ctb] = stored.split(":");
    const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf(), Buffer.from(ivb, "base64"));
    decipher.setAuthTag(Buffer.from(tagb, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(ctb, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

// --- Base32 (RFC 4648, unpadded) ---

function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/=+$/, "").replace(/\s/g, "");
  let bits = 0, value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = B32.indexOf(clean[i]);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// --- TOTP ---

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function otpauthUri(accountLabel: string): string {
  // Note: the secret is added by the caller so it isn't logged here by mistake.
  return `otpauth://totp/${encodeURIComponent(`${ISSUER}:${accountLabel}`)}?issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=30`;
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(buf).digest();
  const off = h[h.length - 1] & 0xf;
  const bin =
    ((h[off] & 0x7f) << 24) |
    ((h[off + 1] & 0xff) << 16) |
    ((h[off + 2] & 0xff) << 8) |
    (h[off + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, "0");
}

/** The current 6-digit code for a secret (for tests / verification tooling). */
export function totpNow(secret: string): string {
  return hotp(secret, Math.floor(Date.now() / 1000 / 30));
}

/** Verify a 6-digit code against the secret, tolerating ±`window` 30s steps. */
export function verifyTotp(secret: string, code: string, window = 1): boolean {
  const c = String(code).trim();
  if (!/^\d{6}$/.test(c)) return false;
  const step = Math.floor(Date.now() / 1000 / 30);
  for (let w = -window; w <= window; w++) {
    if (hotp(secret, step + w) === c) return true;
  }
  return false;
}
