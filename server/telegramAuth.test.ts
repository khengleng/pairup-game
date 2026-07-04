import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  validateInitData,
  telegramDisplayName,
  telegramOpenId,
  INIT_DATA_MAX_AGE_MS,
} from "./telegramAuth";

const BOT_TOKEN = "123456:TEST_TOKEN_abcDEF";

/** Build a correctly-signed initData string for tests. */
function signInitData(
  fields: Record<string, string>,
  token = BOT_TOKEN
): string {
  const dataCheckString = Object.entries(fields)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(token).digest();
  const hash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  const params = new URLSearchParams({ ...fields, hash });
  return params.toString();
}

describe("Telegram initData validation", () => {
  const now = 1_800_000_000_000;
  const authDate = String(Math.floor(now / 1000));
  const user = JSON.stringify({ id: 42, first_name: "Ada", username: "ada" });

  it("accepts a correctly-signed payload and parses the user", () => {
    const initData = signInitData({ auth_date: authDate, user });
    const result = validateInitData(initData, BOT_TOKEN, now);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe(42);
      expect(result.user.username).toBe("ada");
    }
  });

  it("rejects a tampered payload (wrong signature)", () => {
    const initData = signInitData({ auth_date: authDate, user });
    // Replace the hash with a valid-length but incorrect one.
    const tampered = initData.replace(/hash=[0-9a-f]+/, `hash=${"0".repeat(64)}`);
    const result = validateInitData(tampered, BOT_TOKEN, now);
    expect(result.ok).toBe(false);
  });

  it("rejects a tampered user field (re-signed check fails)", () => {
    const initData = signInitData({ auth_date: authDate, user });
    // Change the user id in the (unsigned) payload; signature no longer matches.
    const tampered = initData.replace("id%22%3A42", "id%22%3A99");
    expect(tampered).not.toBe(initData);
    const result = validateInitData(tampered, BOT_TOKEN, now);
    expect(result.ok).toBe(false);
  });

  it("rejects a payload signed with a different token", () => {
    const initData = signInitData({ auth_date: authDate, user }, "999:OTHER");
    const result = validateInitData(initData, BOT_TOKEN, now);
    expect(result.ok).toBe(false);
  });

  it("rejects stale initData beyond the max age", () => {
    const initData = signInitData({ auth_date: authDate, user });
    const result = validateInitData(
      initData,
      BOT_TOKEN,
      now + INIT_DATA_MAX_AGE_MS + 1000
    );
    expect(result.ok).toBe(false);
  });

  it("rejects when hash is missing", () => {
    const params = new URLSearchParams({ auth_date: authDate, user });
    const result = validateInitData(params.toString(), BOT_TOKEN, now);
    expect(result.ok).toBe(false);
  });

  it("derives a stable openId and a friendly display name", () => {
    expect(telegramOpenId({ id: 42 })).toBe("telegram:42");
    expect(telegramDisplayName({ id: 1, username: "ada" })).toBe("@ada");
    expect(
      telegramDisplayName({ id: 1, first_name: "Ada", last_name: "L" })
    ).toBe("Ada L");
    expect(telegramDisplayName({ id: 1 })).toBe("Telegram Player");
  });
});
