import { createHmac, timingSafeEqual } from "crypto";

/**
 * Validate a Telegram Mini App `initData` string.
 *
 * The frontend receives a signed `initData` from `Telegram.WebApp`; we must
 * verify its HMAC server-side before trusting the identity, otherwise anyone
 * could POST a fake Telegram user and climb the leaderboard.
 *
 * Algorithm (per Telegram docs):
 *   secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token)
 *   hash       = HMAC_SHA256(key=secret_key, msg=data_check_string)
 * where data_check_string is every field except `hash`, as `key=value`, sorted
 * alphabetically and joined by "\n".
 */

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

export type InitDataResult =
  | { ok: true; user: TelegramUser; authDate: number }
  | { ok: false; reason: string };

/** initData older than this is rejected (guards against replay). */
export const INIT_DATA_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function validateInitData(
  initData: string,
  botToken: string,
  now: number = Date.now()
): InitDataResult {
  if (!initData || !botToken) return { ok: false, reason: "missing input" };

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return { ok: false, reason: "unparseable" };
  }

  const hash = params.get("hash");
  if (!hash) return { ok: false, reason: "no hash" };
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  if (!safeEqualHex(computed, hash)) return { ok: false, reason: "bad signature" };

  const authDateSec = Number(params.get("auth_date"));
  if (!Number.isFinite(authDateSec)) return { ok: false, reason: "no auth_date" };
  const authDate = authDateSec * 1000;
  if (now - authDate > INIT_DATA_MAX_AGE_MS) return { ok: false, reason: "expired" };

  let user: TelegramUser | null = null;
  try {
    user = JSON.parse(params.get("user") ?? "null");
  } catch {
    return { ok: false, reason: "bad user json" };
  }
  if (!user || typeof user.id !== "number") {
    return { ok: false, reason: "no user" };
  }

  return { ok: true, user, authDate };
}

/** Display name for a Telegram user (prefers @username). */
export function telegramDisplayName(user: TelegramUser): string {
  if (user.username) return `@${user.username}`;
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return full || "Telegram Player";
}

/** Stable openId used to key the Telegram user in the users table. */
export function telegramOpenId(user: TelegramUser): string {
  return `telegram:${user.id}`;
}
