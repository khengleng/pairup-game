import { describe, it, expect } from "vitest";
import {
  generateCode,
  hashCode,
  codeMatches,
  isExpired,
  expiryFromNow,
  CODE_TTL_MS,
} from "./leadVerification";

describe("lead email verification", () => {
  describe("generateCode", () => {
    it("produces a zero-padded 6-digit numeric code", () => {
      for (let i = 0; i < 200; i++) {
        const code = generateCode();
        expect(code).toMatch(/^\d{6}$/);
      }
    });
  });

  describe("hashCode / codeMatches", () => {
    it("never stores the raw code and matches a correct code", () => {
      const code = "123456";
      const hash = hashCode(code);
      expect(hash).not.toContain(code);
      expect(hash).toHaveLength(64); // sha256 hex
      expect(codeMatches(code, hash)).toBe(true);
    });

    it("rejects an incorrect code", () => {
      const hash = hashCode("123456");
      expect(codeMatches("654321", hash)).toBe(false);
    });

    it("rejects when there is no stored hash", () => {
      expect(codeMatches("123456", null)).toBe(false);
    });
  });

  describe("isExpired / expiryFromNow", () => {
    it("treats a null expiry as expired", () => {
      expect(isExpired(null, 1000)).toBe(true);
    });

    it("is not expired before the deadline and expired after", () => {
      const now = 1_000_000;
      const expiry = expiryFromNow(now);
      expect(expiry.getTime()).toBe(now + CODE_TTL_MS);
      expect(isExpired(expiry, now + CODE_TTL_MS - 1)).toBe(false);
      expect(isExpired(expiry, now + CODE_TTL_MS + 1)).toBe(true);
    });
  });
});
