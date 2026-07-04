import { describe, it, expect } from "vitest";
import { shouldSendDailyNudge } from "./telegram";

describe("shouldSendDailyNudge", () => {
  const target = 1; // 01:00 UTC

  it("sends when in the target hour and not yet sent today", () => {
    expect(shouldSendDailyNudge(1, target, "2026-07-03", "2026-07-04")).toBe(true);
    expect(shouldSendDailyNudge(1, target, null, "2026-07-04")).toBe(true);
  });

  it("does not send outside the target hour", () => {
    expect(shouldSendDailyNudge(0, target, "2026-07-03", "2026-07-04")).toBe(false);
    expect(shouldSendDailyNudge(2, target, "2026-07-03", "2026-07-04")).toBe(false);
  });

  it("does not send twice on the same day", () => {
    expect(shouldSendDailyNudge(1, target, "2026-07-04", "2026-07-04")).toBe(false);
  });
});
